import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import {
    assertRunIsolation,
    diffProtectedTreeSnapshots,
    generatorPlatformRoot,
    snapshotProtectedTree,
} from './core/run-isolation-oracle.mjs';
import { probeEvolvableComposition } from './check-evolvable-composition.mjs';

// PLAT-5K: closes director-contract invariant #6, "The evolution run itself
// does not modify core, planner, profiles, or renderers." — the only one of
// the 6 invariants that, before this file, held solely by construction of
// the code (every write in the pipeline happens to target a
// mkdtemp(tmpdir()) path) with no oracle checking it. This suite proves the
// checking oracle itself is not a tautology: it builds a small isolated
// fixture tree (never the real repository), snapshots it, deliberately
// mutates a byte / adds a file / removes a file inside it, and asserts the
// oracle detects each case. It then proves the oracle is wired to the real
// director gate by asserting the real end-to-end probeEvolvableComposition()
// run reports zero violations against the real tools/generator-platform
// source tree.

async function withFixtureTree(build) {
    const root = await mkdtemp(resolve(tmpdir(), 'cmz-run-isolation-fixture-'));
    try {
        await mkdir(resolve(root, 'core'), { recursive: true });
        await mkdir(resolve(root, 'renderers'), { recursive: true });
        await mkdir(resolve(root, 'profiles'), { recursive: true });
        await writeFile(
            resolve(root, 'core', 'artifact-plan.mjs'),
            'export const planned = true;\n'
        );
        await writeFile(
            resolve(root, 'renderers', 'shared.mjs'),
            'export const rendered = true;\n'
        );
        await writeFile(
            resolve(root, 'profiles', 'angular-nx.profile.json'),
            '{"id":"angular-nx"}\n'
        );
        return await build(root);
    } finally {
        await rm(root, { recursive: true, force: true });
    }
}

test('snapshotProtectedTree hashes every file under the given root', async () => {
    await withFixtureTree(async (root) => {
        const snapshot = await snapshotProtectedTree(root);
        assert.equal(snapshot.size, 3);
        assert.ok(snapshot.has('core/artifact-plan.mjs'));
        assert.ok(snapshot.has('renderers/shared.mjs'));
        assert.ok(snapshot.has('profiles/angular-nx.profile.json'));
        for (const entry of snapshot.values()) {
            assert.match(entry.sha256, /^[0-9a-f]{64}$/);
            assert.ok(entry.bytes > 0);
        }
    });
});

test('diffProtectedTreeSnapshots reports no violations between two identical snapshots', async () => {
    await withFixtureTree(async (root) => {
        const before = await snapshotProtectedTree(root);
        const after = await snapshotProtectedTree(root);
        assert.deepEqual(diffProtectedTreeSnapshots(before, after), []);
    });
});

test('diffProtectedTreeSnapshots detects a single modified byte', async () => {
    await withFixtureTree(async (root) => {
        const before = await snapshotProtectedTree(root);
        const targetPath = resolve(root, 'core', 'artifact-plan.mjs');
        const original = await readFile(targetPath, 'utf8');
        await writeFile(targetPath, `${original}\n// one extra byte\n`);
        const after = await snapshotProtectedTree(root);
        const violations = diffProtectedTreeSnapshots(before, after);
        assert.equal(violations.length, 1);
        assert.match(violations[0], /^modified: core\/artifact-plan\.mjs/);
    });
});

test('diffProtectedTreeSnapshots detects an added file', async () => {
    await withFixtureTree(async (root) => {
        const before = await snapshotProtectedTree(root);
        await writeFile(
            resolve(root, 'core', 'unexpected.mjs'),
            'export const leaked = true;\n'
        );
        const after = await snapshotProtectedTree(root);
        assert.deepEqual(diffProtectedTreeSnapshots(before, after), [
            'added: core/unexpected.mjs',
        ]);
    });
});

test('diffProtectedTreeSnapshots detects a removed file', async () => {
    await withFixtureTree(async (root) => {
        const before = await snapshotProtectedTree(root);
        await rm(resolve(root, 'renderers', 'shared.mjs'));
        const after = await snapshotProtectedTree(root);
        assert.deepEqual(diffProtectedTreeSnapshots(before, after), [
            'removed: renderers/shared.mjs',
        ]);
    });
});

// This is the "mutant killed" proof for PLAT-5K, analogous in spirit to the
// rendered-guard mutants in presentation-flow-mutations.test.mjs /
// behavior-graph-mutations.test.mjs, but applied to a claim about absence of
// a side effect rather than to a rendered guard. Instead of mutating a
// renderer's control flow, this simulates the exact failure the invariant
// exists to prevent: an "evolution run" whose write accidentally lands
// inside the protected tree instead of a mkdtemp scratch directory (e.g. a
// future bug that mis-resolves an output path). assertRunIsolation must
// detect it and throw. A second scenario proves the oracle also passes
// cleanly on a run that behaves correctly (writes only outside the
// protected root), so the failure above is not caused by the harness itself
// always throwing regardless of what the run does.
test('assertRunIsolation throws when a run writes inside the protected root (mutant killed)', async () => {
    await withFixtureTree(async (root) => {
        const accidentalWrite = () =>
            writeFile(
                resolve(root, 'core', 'artifact-plan.mjs'),
                'export const planned = false; // accidental mutation\n'
            );
        await assert.rejects(
            () => assertRunIsolation(accidentalWrite, { root }),
            /run isolation violated/,
            'a run that writes inside the protected root must be rejected'
        );
        // The corrupting write really happened (the oracle does not roll it
        // back, it only detects and reports it) — confirms the rejection
        // above is caused by real detection, not a mocked/short-circuited
        // path.
        const corrupted = await readFile(
            resolve(root, 'core', 'artifact-plan.mjs'),
            'utf8'
        );
        assert.match(corrupted, /accidental mutation/);
    });
});

test('assertRunIsolation resolves cleanly when a run only writes outside the protected root', async () => {
    await withFixtureTree(async (root) => {
        const scratchRoot = await mkdtemp(
            resolve(tmpdir(), 'cmz-run-isolation-scratch-')
        );
        try {
            const wellBehavedRun = async () => {
                await writeFile(
                    resolve(scratchRoot, 'output.txt'),
                    'generated output, outside the protected tree\n'
                );
                return 'ok';
            };
            const { result, filesChecked } = await assertRunIsolation(
                wellBehavedRun,
                { root }
            );
            assert.equal(result, 'ok');
            assert.equal(filesChecked, 3);
        } finally {
            await rm(scratchRoot, { recursive: true, force: true });
        }
    });
});

test('assertRunIsolation detects a removed file the same way it detects a modification', async () => {
    await withFixtureTree(async (root) => {
        const accidentalDelete = () =>
            rm(resolve(root, 'profiles', 'angular-nx.profile.json'));
        await assert.rejects(
            () => assertRunIsolation(accidentalDelete, { root }),
            /run isolation violated/
        );
    });
});

test('assertRunIsolation detects a leaked file added inside the protected root', async () => {
    await withFixtureTree(async (root) => {
        const accidentalAdd = () =>
            writeFile(
                resolve(root, 'renderers', 'leaked.mjs'),
                'export const leaked = true;\n'
            );
        await assert.rejects(
            () => assertRunIsolation(accidentalAdd, { root }),
            /run isolation violated/
        );
    });
});

test('the real director-gate evolution run leaves the real generator-platform source tree untouched', async () => {
    // This is the integration proof: probeEvolvableComposition() runs the
    // real target computation, permission/behavior-graph/presentation-flow
    // oracles, persisted-instance cycle and existing-output/dry-run/apply
    // sequence — all real execution, not simulated — with
    // assertRunIsolation wrapping the entire thing against the real
    // tools/generator-platform tree (generatorPlatformRoot), not a fixture.
    const report = await probeEvolvableComposition();
    assert.equal(report.run_isolation.violated, false);
    assert.ok(report.run_isolation.files_checked > 0);
    // Sanity check that the oracle really is pointed at the real source
    // tree used by this repository, not an empty or unrelated directory.
    assert.match(generatorPlatformRoot, /tools\/generator-platform$/);
});
