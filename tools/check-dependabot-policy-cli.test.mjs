// Test de la CLI réelle de check-dependabot-policy, sorti de
// check-dependabot-policy.test.mjs (plafond de 800 lignes par fichier,
// check-file-weight.mjs) ; importé par lui, donc exécuté au même point
// d'entrée check:dependabot-policy.
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import {
    cpSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

test('B : la CLI réelle lie les exclusions au workflow et refuse une délégation inopérante', (t) => {
    const source = fileURLToPath(new URL('..', import.meta.url));
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'cmz-nx-policy-')));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, 'tools'), { recursive: true });
    mkdirSync(join(root, '.github/workflows'), { recursive: true });
    mkdirSync(join(root, 'node_modules'));
    // Copies physiques des trois dépendances de ces outils seulement : ce
    // test de CLI ne monte aucun projet ni graphe de qualification factice.
    const require = createRequire(import.meta.url);
    for (const name of ['semver', 'yaml', 'jsonc-parser']) {
        cpSync(
            dirname(require.resolve(`${name}/package.json`)),
            join(root, 'node_modules', name),
            { recursive: true }
        );
    }
    for (const path of [
        'package.json',
        'bun.lock',
        'tools/check-dependabot-policy.mjs',
        'tools/check-dependabot-assignees.mjs',
        'tools/dependabot-nginx-relay-policy.mjs',
        'tools/check-library-setup-deps.mjs',
        'tools/nx-migration-plan.mjs',
        'tools/check-workflow-privileges.mjs',
        'tools/audit-exceptions.mjs',
        'tools/runtime-version-policy.mjs',
        'tools/runtime-version-workflow.mjs',
    ]) {
        cpSync(join(source, path), join(root, path));
    }
    const workflowPath = join(root, '.github/workflows/nx-migrations.yml');
    const workflow = parseYaml(
        readFileSync(
            join(source, '.github/workflows/nx-migrations.yml'),
            'utf8'
        )
    );
    const original = parseYaml(
        readFileSync(join(source, '.github/dependabot.yml'), 'utf8')
    );
    const selectors = JSON.parse(workflow.env.NX_MIGRATION_SELECTORS);
    const rootBun = (value) =>
        value.updates.find(
            (u) => u['package-ecosystem'] === 'bun' && u.directory === '/'
        );
    const withoutDelegation = structuredClone(original);
    rootBun(withoutDelegation).ignore = (rootBun(original).ignore ?? []).filter(
        (entry) => !selectors.includes(entry['dependency-name'])
    );
    const delegate = (sourceConfig) => {
        const next = structuredClone(sourceConfig);
        rootBun(next).ignore = [
            ...(rootBun(next).ignore ?? []).filter(
                (entry) => !selectors.includes(entry['dependency-name'])
            ),
            ...selectors.map((name) => ({ 'dependency-name': name })),
        ];
        return next;
    };
    const config = delegate(original);
    // Both possible real source configurations yield the same fixture.
    assert.deepEqual(delegate(withoutDelegation), config);
    assert.deepEqual(delegate(config), config);
    const prepare = () => {
        writeFileSync(
            join(root, '.github/dependabot.yml'),
            stringifyYaml(config)
        );
        writeFileSync(workflowPath, stringifyYaml(workflow));
    };
    const execute = () =>
        spawnSync(
            process.execPath,
            [join(root, 'tools/check-dependabot-policy.mjs')],
            { cwd: root, encoding: 'utf8' }
        );
    prepare();
    let result = execute();
    assert.equal(
        result.status,
        0,
        `délégation opérationnelle refusée : ${result.stderr}`
    );
    for (const mutate of [
        () => {
            const duplicate = structuredClone(config);
            rootBun(duplicate).ignore.push({ 'dependency-name': selectors[0] });
            writeFileSync(
                join(root, '.github/dependabot.yml'),
                stringifyYaml(duplicate)
            );
        },
        () => rmSync(workflowPath),
        () => {
            const w = structuredClone(workflow);
            w.jobs.calculate.if = false;
            writeFileSync(workflowPath, stringifyYaml(w));
        },
        () => {
            const w = structuredClone(workflow);
            delete w.jobs.calculate;
            writeFileSync(workflowPath, stringifyYaml(w));
        },
        () => {
            const w = structuredClone(workflow);
            w.jobs.plan.steps.find((s) => s.id === 'plan').run =
                'node tools/nx-migration-plan.mjs plan --selectors "autre"';
            writeFileSync(workflowPath, stringifyYaml(w));
        },
        () => {
            const extra = structuredClone(config);
            extra.updates
                .find((u) => u['package-ecosystem'] === 'bun')
                .ignore.push({ 'dependency-name': '@outside/*' });
            writeFileSync(
                join(root, '.github/dependabot.yml'),
                stringifyYaml(extra)
            );
        },
        // Une entrée sans assigné : le garde des assignees est bien branché.
        () => {
            const unassigned = structuredClone(config);
            delete unassigned.updates.at(-1).assignees;
            writeFileSync(
                join(root, '.github/dependabot.yml'),
                stringifyYaml(unassigned)
            );
        },
    ]) {
        prepare();
        mutate();
        result = execute();
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /Politique Dependabot invalide/);
    }
    // Le point d'entrée réel exige aussi le regroupement des mineures et
    // correctives : son retrait dans un écosystème est rouge et nommé.
    prepare();
    const ungrouped = structuredClone(config);
    delete ungrouped.updates.find(
        (u) => u['package-ecosystem'] === 'github-actions'
    ).groups;
    writeFileSync(
        join(root, '.github/dependabot.yml'),
        stringifyYaml(ungrouped)
    );
    result = execute();
    assert.equal(result.status, 1, result.stderr);
    assert.match(
        result.stderr,
        /Dependabot github-actions \/ : groupes absents/
    );
    // Sans délégation, les exclusions par incompatibilité de pairs gardent
    // exactement le chemin normal du garde.
    prepare();
    writeFileSync(
        join(root, '.github/dependabot.yml'),
        stringifyYaml(withoutDelegation)
    );
    result = execute();
    assert.equal(result.status, 0, result.stderr);
});
