import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { parse } from 'yaml';
import test from 'node:test';

import {
    commandInvokes,
    hookCommands,
    packageToolInvocations,
    workflowRunCommands,
} from './check-ci-wiring.mjs';

test('la configuration de lint des outils refuse les identifiants non liés', async () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const eslint = new ESLint({
        cwd: root,
        overrideConfigFile: join(root, 'eslint.config.mjs'),
        allowInlineConfig: false,
        fix: false,
        cache: false,
    });
    const cases = [
        {
            code: "process.stdout.write('fixture');\n",
            expected: [],
        },
        {
            code: 'process.stdout.write(cmzUndefinedLintProbe);\n',
            expected: [{ ruleId: 'no-undef', severity: 2 }],
        },
        {
            code: 'process.stdout.write(typeof cmzUndefinedLintProbe);\n',
            expected: [{ ruleId: 'no-undef', severity: 2 }],
        },
    ];
    for (const file of [
        'tools/check-engines.mjs',
        'tools/generator-platform/validate-ir.mjs',
    ]) {
        const filePath = join(root, file);
        assert.equal(await eslint.isPathIgnored(filePath), false, file);
        for (const { code, expected } of cases) {
            const results = await eslint.lintText(code, { filePath });
            assert.equal(results.length, 1, file);
            const result = results[0];
            assert.equal(result.fatalErrorCount, 0, file);
            assert.ok(
                result.messages.every((message) => message.fatal !== true)
            );
            assert.deepEqual(
                result.messages.map(({ ruleId, severity }) => ({
                    ruleId,
                    severity,
                })),
                expected,
                `${file}: ${code}`
            );
        }
    }
});

test('ignore une commande seulement citée dans un commentaire YAML', () => {
    const commands = workflowRunCommands(`
# bun run check:ghost
jobs:
  proof:
    runs-on: ubuntu-latest
    steps:
      - name: autre contrôle
        run: bun run check:real
`);
    assert.deepEqual(commands, ['bun run check:real']);
});

test('extrait les commandes simples et multilignes des steps réelles', () => {
    const commands = workflowRunCommands(`
jobs:
  proof:
    steps:
      - run: bun run check:first
      - run: |
          bun run check:second
          bun run check:third
`);
    assert.deepEqual(commands, [
        'bun run check:first',
        'bun run check:second\nbun run check:third\n',
    ]);
});

test('refuse un workflow YAML invalide', () => {
    assert.throws(
        () => workflowRunCommands('jobs:\n  broken: [', 'broken.yml'),
        /broken\.yml: YAML invalide/
    );
});

test('ignore les commentaires des hooks', () => {
    assert.deepEqual(
        hookCommands('# bun run check:ghost\nbun run check:real\n'),
        ['bun run check:real']
    );
});

test('ne confond pas une commande exécutée avec du texte affiché', () => {
    assert.equal(
        commandInvokes(
            'echo "bun run check:library-setup-integration"',
            'bun run check:library-setup-integration'
        ),
        false
    );
    assert.equal(
        commandInvokes(
            'prepare && bun run check:library-setup-integration --verbose',
            'bun run check:library-setup-integration'
        ),
        true
    );
});

test('extrait toutes les commandes Node feuilles d’un script package', () => {
    assert.deepEqual(
        packageToolInvocations(
            'node --test tools/check-a.test.mjs && node tools/check-a.mjs'
        ),
        ['node --test tools/check-a.test.mjs', 'node tools/check-a.mjs']
    );
});

test('bloque la dérive bundle dans la CI de PR après un build production frais', () => {
    const ci = readFileSync(
        new URL('../.github/workflows/ci.yml', import.meta.url),
        'utf8'
    );
    const commands = workflowRunCommands(ci, '.github/workflows/ci.yml');
    const gate = commands.find((command) =>
        commandInvokes(command, 'bun run check:bundle-metrics-freshness')
    );

    assert.ok(
        gate,
        'ci.yml doit exécuter check:bundle-metrics-freshness avant fusion'
    );
    const build = 'bunx nx run backoffice-angular:build:production';
    const check = 'bun run check:bundle-metrics-freshness';
    assert.ok(
        commandInvokes(gate, build),
        'la gate doit mesurer un build production Ubuntu frais dans la même step'
    );
    assert.ok(
        gate.indexOf(build) < gate.indexOf(check),
        'le build production doit précéder la comparaison de baseline'
    );
});

test('borne le miroir APT avant l’installation officielle Playwright', () => {
    const ci = readFileSync(
        new URL('../.github/workflows/ci.yml', import.meta.url),
        'utf8'
    );
    const commands = workflowRunCommands(ci, '.github/workflows/ci.yml');
    const aptPolicyIndex = commands.findIndex((command) =>
        command.includes('/etc/apt/apt.conf.d/80-cmz-ci-network')
    );
    const playwrightIndex = commands.findIndex((command) =>
        commandInvokes(command, 'bunx playwright install chromium --with-deps')
    );

    assert.notEqual(aptPolicyIndex, -1, 'la politique réseau APT doit exister');
    assert.notEqual(
        playwrightIndex,
        -1,
        'l’installation officielle Playwright doit rester présente'
    );
    assert.ok(
        aptPolicyIndex < playwrightIndex,
        'la politique APT doit être appliquée avant Playwright'
    );

    const aptPolicy = commands[aptPolicyIndex];
    assert.match(aptPolicy, /Acquire::Retries "1";/);
    assert.match(aptPolicy, /Acquire::http::Timeout "10";/);
    assert.match(aptPolicy, /Acquire::https::Timeout "10";/);
    assert.doesNotMatch(
        aptPolicy,
        /\|\|\s*(?:true|echo)/,
        'une panne APT ne doit jamais être masquée'
    );
});

test('exécute la preuve navigateur C5 React dans la CI de PR', () => {
    const ci = readFileSync(
        new URL('../.github/workflows/ci.yml', import.meta.url),
        'utf8'
    );
    const commands = workflowRunCommands(ci, '.github/workflows/ci.yml');
    assert.ok(
        commands.some((command) =>
            commandInvokes(
                command,
                'bunx playwright test -c apps/users-management-react-proof/playwright.config.mjs'
            )
        ),
        'la preuve Chromium C5 React doit rester bloquante quand le projet est affecté'
    );
    assert.match(
        ci,
        /test-results\/users-management-react-proof\/\*\*\/\*\.actual\.png/
    );
});

test('profile la mémoire C5 React sur un build production frais au nightly', () => {
    const nightly = readFileSync(
        new URL(
            '../.github/workflows/nightly-integration.yml',
            import.meta.url
        ),
        'utf8'
    );
    const commands = workflowRunCommands(
        nightly,
        '.github/workflows/nightly-integration.yml'
    );
    const build = 'bunx nx run users-management-react-proof:build';
    const profile =
        'bunx playwright test -c apps/users-management-react-proof/playwright.memory.config.mjs';
    const buildIndex = commands.findIndex((command) =>
        commandInvokes(command, build)
    );
    const profileIndex = commands.findIndex((command) =>
        commandInvokes(command, profile)
    );
    assert.notEqual(buildIndex, -1, 'le build React C5 doit exister');
    assert.notEqual(profileIndex, -1, 'le profil mémoire C5 doit exister');
    assert.ok(
        buildIndex < profileIndex,
        'le build production C5 doit précéder son profil mémoire'
    );
    assert.match(
        nightly,
        /test-results\/\*\*\/users-management-react-memory-profile\.json/
    );
});

test('T17 : preuve extérieure réelle, versions installées et rapports texte sont câblés', () => {
    const ci = readFileSync(
        new URL('../.github/workflows/ci.yml', import.meta.url),
        'utf8'
    );
    const pkg = JSON.parse(
        readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    );
    function requireExternalProof(workflow) {
        const commands = workflowRunCommands(workflow);
        for (const invocation of [
            'bun run test:external-application-shells',
            'bun run check:external-application-shells',
        ]) {
            assert.ok(
                commands.some((command) => commandInvokes(command, invocation)),
                `Invocation absente : ${invocation}`
            );
        }
    }
    requireExternalProof(ci);
    assert.equal(
        pkg.scripts['check:external-application-shells'],
        'node tools/generator-platform/check-external-application-shells.mjs'
    );
    assert.match(
        pkg.scripts['test:external-application-shells'],
        /external-application-shell.test.mjs/
    );
    const invocation = 'bun run check:external-application-shells';
    assert.throws(() =>
        requireExternalProof(ci.replace(invocation, `echo '${invocation}'`))
    );
    assert.throws(() =>
        requireExternalProof(ci.replace(invocation, '# ' + invocation))
    );
    assert.match(ci, /CMZ_EXTERNAL_APPLICATION_PROOF_ROOT/);
    assert.doesNotMatch(ci, /CMZ_EXTERNAL_APPLICATION_PROOF_ROOT[^\n]*\*\*/);
});

function requireCanonicalExternalProof(workflow, t) {
    const steps = parse(workflow).jobs['external-application-shells'].steps;
    const setup = steps.find((step) => step.id === 'external-proof-root');
    const proof = steps.find(
        (step) =>
            typeof step.run === 'string' &&
            commandInvokes(
                step.run,
                'bun run check:external-application-shells'
            )
    );
    const upload = steps.find((step) =>
        step.uses?.startsWith('actions/upload-artifact@')
    );
    const argument = proof?.run.match(/--proof-root "([^"]+)"/)?.[1];
    const artifact = upload?.with?.path;
    assert.equal(argument, '${{ env.CMZ_EXTERNAL_APPLICATION_PROOF_ROOT }}');
    assert.equal(artifact, argument + '/report.txt');
    assert.ok(setup?.run);
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'cmz-proof-path-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, 'physical/checkout'), { recursive: true });
    symlinkSync(join(root, 'physical'), join(root, 'alias'));
    const result = spawnSync(
        '/bin/bash',
        ['-e', '-o', 'pipefail', '-c', setup.run],
        {
            encoding: 'utf8',
            cwd: root,
            env: {
                HOME: root,
                PATH: '/usr/bin:/bin',
                GITHUB_WORKSPACE: join(root, 'alias/checkout'),
                GITHUB_ENV: join(root, 'github-env'),
            },
        }
    );
    assert.equal(result.status, 0, result.stderr);
    const lines = readFileSync(join(root, 'github-env'), 'utf8')
        .trim()
        .split('\n');
    assert.equal(lines.length, 1);
    assert.ok(lines[0].startsWith('CMZ_EXTERNAL_APPLICATION_PROOF_ROOT='));
    const path = lines[0].slice('CMZ_EXTERNAL_APPLICATION_PROOF_ROOT='.length);
    assert.ok(isAbsolute(path));
    assert.equal(path, resolve(path), 'chemin canonique requis, sans ..');
    assert.equal(dirname(path), realpathSync(join(root, 'physical')));
    assert.equal(path, join(root, 'physical/cmz-external-application-proof'));
}

test('T17 v10 : preuve et artefact canoniques, hors checkout même via un lien', (t) => {
    const workflow = readFileSync(
        new URL('../.github/workflows/ci.yml', import.meta.url),
        'utf8'
    );
    requireCanonicalExternalProof(workflow, t);
    const root = '${{ env.CMZ_EXTERNAL_APPLICATION_PROOF_ROOT }}';
    assert.throws(() =>
        requireCanonicalExternalProof(
            workflow.replace(
                '--proof-root "' + root + '"',
                '--proof-root "' + root + '/../proof"'
            ),
            t
        )
    );
    assert.throws(() =>
        requireCanonicalExternalProof(
            workflow.replace(
                'path: ' + root + '/report.txt',
                'path: ' + root + '/../proof/report.txt'
            ),
            t
        )
    );
    assert.throws(
        () =>
            requireCanonicalExternalProof(
                workflow.replace(
                    '%s/cmz-external-application-proof',
                    '%s/../cmz-external-application-proof'
                ),
                t
            ),
        /canonique/
    );
});
