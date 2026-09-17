import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
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

test('la voie courante traverse trois modules et aucune brique de qualification', () => {
    const graph = productionGraph(join(ROOT, 'tools/add-library.mjs'));
    assert.deepEqual(
        graph.map((path) => basename(path)),
        ['add-library.mjs', 'library-application.mjs', 'qualified-adapters.mjs']
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
