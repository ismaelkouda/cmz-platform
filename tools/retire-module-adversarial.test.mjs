import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import {
    findNxGraphConsumers,
    runPostRemovalNxGate,
} from './retire-module-nx.mjs';
import { createRetirementPlan } from './retire-module-plan.mjs';

async function write(path, content) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
}

async function workspace(t, prefix) {
    const root = await mkdtemp(join(tmpdir(), prefix));
    t.after(() => rm(root, { recursive: true, force: true }));
    const initialized = spawnSync('git', ['init', '--quiet'], {
        cwd: root,
        encoding: 'utf8',
    });
    assert.equal(initialized.status, 0, initialized.stderr);
    return root;
}

async function withFakeBunx(t, graph, affectedExit = 0) {
    const root = await workspace(t, 'cmz-retire-nx-adversarial-');
    let projectIndex = 0;
    for (const name of Object.keys(graph.graph.nodes)) {
        const scope = `graph-${projectIndex}`;
        await write(
            join(root, 'libs', scope, 'project.json'),
            `${JSON.stringify({ name, tags: [`scope:${scope}`] })}\n`
        );
        projectIndex += 1;
    }
    const bin = join(root, 'bin');
    await write(
        join(bin, 'bunx'),
        [
            '#!/bin/sh',
            'if [ "$1 $2 $3" = "nx graph --file=stdout" ]; then',
            '  printf "%s" "$CMZ_FAKE_NX_GRAPH"',
            '  exit 0',
            'fi',
            'if [ "$1 $2" = "nx affected" ]; then',
            '  exit "$CMZ_FAKE_NX_AFFECTED_EXIT"',
            'fi',
            'exit 64',
        ].join('\n') + '\n'
    );
    await chmod(join(bin, 'bunx'), 0o755);
    const previous = {
        path: process.env.PATH,
        graph: process.env.CMZ_FAKE_NX_GRAPH,
        affected: process.env.CMZ_FAKE_NX_AFFECTED_EXIT,
    };
    process.env.PATH = `${bin}:${previous.path || ''}`;
    process.env.CMZ_FAKE_NX_GRAPH = JSON.stringify(graph);
    process.env.CMZ_FAKE_NX_AFFECTED_EXIT = String(affectedExit);
    t.after(() => {
        process.env.PATH = previous.path;
        if (previous.graph === undefined) delete process.env.CMZ_FAKE_NX_GRAPH;
        else process.env.CMZ_FAKE_NX_GRAPH = previous.graph;
        if (previous.affected === undefined)
            delete process.env.CMZ_FAKE_NX_AFFECTED_EXIT;
        else process.env.CMZ_FAKE_NX_AFFECTED_EXIT = previous.affected;
    });
    return root;
}

test('refuse un projet étranger même sous un dossier nommé corpus', async (t) => {
    const root = await workspace(t, 'cmz-retire-plan-adversarial-');
    await write(
        join(root, 'libs/target/domain/project.json'),
        JSON.stringify({ name: '@cmz/target-domain', tags: ['scope:target'] })
    );
    await write(
        join(root, 'libs/target/corpus/foreign/project.json'),
        JSON.stringify({ name: '@cmz/foreign-domain', tags: ['scope:foreign'] })
    );

    assert.throws(
        () => createRetirementPlan(root, 'target'),
        /Conteneur Nx ambigu/
    );
});

test('refuse un graphe Nx tronqué sans liste de dépendances par nœud', async (t) => {
    const graph = {
        graph: {
            nodes: {
                '@cmz/target-domain': { name: '@cmz/target-domain' },
                '@cmz/consumer': { name: '@cmz/consumer' },
            },
            dependencies: {},
        },
    };
    const root = await withFakeBunx(t, graph);

    assert.throws(
        () =>
            findNxGraphConsumers(root, {
                projects: [{ name: '@cmz/target-domain' }],
            }),
        /Graphe Nx incomplet/
    );
});

test('NODE_ENV=test ne permet plus de remplacer le graphe ni de sauter les gates', async (t) => {
    const graph = {
        graph: {
            nodes: {
                '@cmz/target-domain': { name: '@cmz/target-domain' },
                '@cmz/consumer': { name: '@cmz/consumer' },
            },
            dependencies: {
                '@cmz/target-domain': [],
                '@cmz/consumer': [
                    {
                        source: '@cmz/consumer',
                        target: '@cmz/target-domain',
                        type: 'static',
                    },
                ],
            },
        },
    };
    const root = await withFakeBunx(t, graph, 42);
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    process.env.CMZ_RETIRE_MODULE_TEST_NX_GRAPH = JSON.stringify({
        graph: { nodes: {}, dependencies: {} },
    });
    process.env.CMZ_RETIRE_MODULE_TEST_SKIP_NX_GATES = '1';
    t.after(() => {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
        delete process.env.CMZ_RETIRE_MODULE_TEST_NX_GRAPH;
        delete process.env.CMZ_RETIRE_MODULE_TEST_SKIP_NX_GATES;
    });

    assert.deepEqual(
        findNxGraphConsumers(root, {
            projects: [{ name: '@cmz/target-domain' }],
        }),
        [
            {
                consumer: '@cmz/consumer',
                target: '@cmz/target-domain',
                type: 'static',
            },
        ]
    );
    process.env.CMZ_FAKE_NX_GRAPH = JSON.stringify({
        graph: { nodes: graph.graph.nodes, dependencies: {} },
    });
    assert.equal(runPostRemovalNxGate(root).ok, false);
});
