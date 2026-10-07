import assert from 'node:assert/strict';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import { libraryApplicationInternals } from './library-application.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;

function productionGraph(entry) {
    const visited = new Set();
    const visit = (path) => {
        const normalized = normalize(path);
        if (visited.has(normalized)) return;
        visited.add(normalized);
        const source = readFileSync(normalized, 'utf8');
        const imports = source.matchAll(
            /^(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"](\.[^'"]+)['"]/gm
        );
        for (const match of imports) {
            const target = normalize(join(dirname(normalized), match[1]));
            visit(target.endsWith('.mjs') ? target : `${target}.mjs`);
        }
    };
    visit(entry);
    return [...visited].sort();
}

test('la voie courante traverse l’adaptateur pur sans brique de qualification', () => {
    const graph = productionGraph(join(ROOT, 'tools/add-library.mjs'));
    assert.deepEqual(
        graph.map((path) => basename(path)),
        [
            'add-library.mjs',
            'library-application.mjs',
            'qualified-adapters.mjs',
            'scaffold-tailwind-core.mjs',
        ]
    );
    const imports = graph.map((path) => readFileSync(path, 'utf8')).join('\n');
    for (const forbidden of [
        "from './sandbox.mjs'",
        "from './browser-provisioning.mjs'",
        "from './recipe-execution.mjs'",
        "from './compatibility-promotion.mjs'",
    ]) {
        assert.doesNotMatch(
            imports,
            new RegExp(forbidden.replaceAll('.', '\\.'))
        );
    }
});

test('le plan courant est stable, explicite et ne contient aucun état de sandbox', () => {
    const input = {
        app: 'demo',
        library: 'tailwind',
        baseCommit: 'a'.repeat(40),
        configuration: {
            platform: 'angular',
            track: { id: 'angular-22-tailwind-4' },
            descriptor: { digest_sha256: 'b'.repeat(64) },
        },
        changes: { change_set_id: `changes:${'c'.repeat(64)}` },
        checks: ['build', 'lint', 'test'],
    };
    const first = libraryApplicationInternals.applicationPlan(input);
    const second = libraryApplicationInternals.applicationPlan(
        structuredClone(input)
    );
    assert.deepEqual(second, first);
    assert.match(first.plan_id, /^library-plan:[a-f0-9]{64}$/);
    assert.equal(first.kind, 'qualified-library-application');
    assert.equal(JSON.stringify(first).includes('sandbox'), false);
    assert.equal(JSON.stringify(first).includes('browser'), false);
});

test('la voie courante reconnaît une app React/Vite Nx sans target build explicite', () => {
    const root = mkdtempSync(join(tmpdir(), 'cmz-library-react-platform-'));
    try {
        mkdirSync(join(root, 'apps', 'demo', 'src'), { recursive: true });
        writeFileSync(
            join(root, 'package.json'),
            `${JSON.stringify({
                packageManager: 'bun@1.3.14',
                devDependencies: { nx: '23.2.1', react: '19.3.0' },
            })}\n`
        );
        writeFileSync(
            join(root, 'apps', 'demo', 'project.json'),
            `${JSON.stringify({
                name: 'demo',
                projectType: 'application',
                sourceRoot: 'apps/demo/src',
            })}\n`
        );
        writeFileSync(
            join(root, 'apps', 'demo', 'vite.config.mts'),
            "import react from '@vitejs/plugin-react';\nexport default { plugins: [react()] };\n"
        );

        const detected = libraryApplicationInternals.detectPlatform(
            root,
            'demo'
        );
        assert.equal(detected.platform, 'react');
        assert.equal(
            libraryApplicationInternals.workspaceVersions(root, 'react')
                .versions.framework,
            '19.3.0'
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('une app Nx avec un vite.config non React reste refusée', () => {
    const root = mkdtempSync(join(tmpdir(), 'cmz-library-unknown-platform-'));
    try {
        mkdirSync(join(root, 'apps', 'demo', 'src'), { recursive: true });
        writeFileSync(
            join(root, 'apps', 'demo', 'project.json'),
            `${JSON.stringify({
                name: 'demo',
                projectType: 'application',
                sourceRoot: 'apps/demo/src',
            })}\n`
        );
        writeFileSync(
            join(root, 'apps', 'demo', 'vite.config.mts'),
            "import { defineConfig } from 'vite';\nexport default defineConfig({});\n"
        );

        assert.throws(
            () => libraryApplicationInternals.detectPlatform(root, 'demo'),
            /plateforme qualifiée indéterminée/
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('les checks courants utilisent aussi les targets inférées par Nx', () => {
    assert.deepEqual(
        libraryApplicationInternals.targetedChecks(
            {
                targets: {
                    serve: {},
                    test: {},
                    build: {},
                    lint: {},
                },
            },
            'demo'
        ),
        ['build', 'lint', 'test']
    );
    assert.throws(
        () =>
            libraryApplicationInternals.targetedChecks(
                { targets: { lint: {}, test: {} } },
                'demo'
            ),
        /target build obligatoire/
    );
});
