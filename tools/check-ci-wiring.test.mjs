import assert from 'node:assert/strict';
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
