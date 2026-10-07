import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    commandInvokes,
    hookCommands,
    packageToolInvocations,
    workflowRunCommands,
} from './check-ci-wiring.mjs';

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
