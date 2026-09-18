import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { commandInvokes, workflowRunCommands } from './check-ci-wiring.mjs';
import {
    CREATE_MODULE_DEFERRED_CI_GATES,
    createModuleLocalGateCommands,
} from './create-module-gates.mjs';

test('le chemin nominal ne garde que les validations des projets et fichiers touchés', () => {
    const projects = [
        '@cmz/orders-domain',
        '@cmz/orders-data',
        '@cmz/orders-application',
    ];
    const commands = createModuleLocalGateCommands(projects, 'libs/orders');
    assert.deepEqual(
        commands.map(({ id }) => id),
        ['install', 'build', 'build', 'build', 'lint', 'format']
    );
    assert.deepEqual(commands[0], {
        id: 'install',
        command: 'bun',
        args: ['install', '--ignore-scripts'],
    });
    assert.deepEqual(
        commands.filter(({ id }) => id === 'build').map(({ args }) => args[2]),
        projects.map((project) => `${project}:build`)
    );
    const serialized = JSON.stringify(commands);
    for (const forbidden of [
        'check-project-names',
        'check-project-targets',
        'check-declared-deps',
        'nx graph',
        '--frozen-lockfile',
    ])
        assert.doesNotMatch(serialized, new RegExp(forbidden));
});

test('chaque gate globale retirée reste une step directe et bloquante de la CI', () => {
    const workflow = readFileSync(
        new URL('../.github/workflows/ci.yml', import.meta.url),
        'utf8'
    );
    const commands = workflowRunCommands(workflow, '.github/workflows/ci.yml');
    for (const gate of CREATE_MODULE_DEFERRED_CI_GATES) {
        assert.equal(
            commands.some((command) => commandInvokes(command, gate.direct)),
            true,
            `${gate.script} absent de la CI : ${gate.reason}`
        );
    }
});

test('les gates ciblées refusent une portée vide, dupliquée ou hors libs', () => {
    assert.throws(() => createModuleLocalGateCommands([], 'libs/orders'));
    assert.throws(() =>
        createModuleLocalGateCommands(
            ['@cmz/orders-domain', '@cmz/orders-domain'],
            'libs/orders'
        )
    );
    assert.throws(() =>
        createModuleLocalGateCommands(['@cmz/orders-domain'], '../orders')
    );
});

test('create-module ne dépend plus de primitives nommées pour le retrait', () => {
    const source = readFileSync(
        new URL('./create-module.mjs', import.meta.url),
        'utf8'
    );
    assert.doesNotMatch(source, /from ['"]\.\/retire-module-/);
    assert.match(source, /from ['"]\.\/workspace-transaction\.mjs['"]/);
});
