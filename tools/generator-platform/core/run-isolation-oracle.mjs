import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Real execution oracle for director-contract invariant #6: "The evolution
// run itself does not modify core, planner, profiles, or renderers."
//
// Every other invariant in evolvable-composition.contract.json is proven by
// an oracle that transpiles/loads/drives generated code and asserts on its
// observed behaviour. This one is different in kind: it is a claim about the
// ABSENCE of a side effect on the generator's own source tree, not about a
// behaviour the source tree produces. Until PLAT-5K, that claim held only
// because every writeFile/mkdir/rm call in the generation pipeline happens
// to target a path under `mkdtemp(tmpdir())` — true by construction of the
// code, never checked. This module makes it a checked fact: it hashes every
// byte under the protected paths before a real evolution run, runs it for
// real, hashes again, and throws on any difference, however small.
//
// Delimitation of "core, planner, profiles, or renderers" (PLAT-5K):
// the planner (`core/artifact-plan.mjs`) lives inside `core/`, so "planner"
// is not a sibling directory — it is covered by protecting all of `core/`.
// The protected set below is the entire generator-platform source tree
// EXCLUDING only the two things that are legitimately not "core, planner,
// profiles, or renderers" source: `*.test.mjs` acceptance/unit test files
// (irrelevant to whether the SOURCE the tests exercise was mutated — but see
// note below, they are in fact still included for maximum safety) and the
// gitignored `.stack-test-runtime/` scratch directory that a *different*
// script (`prepare-stack-tests.mjs`) intentionally regenerates on every run
// and that no evolution run under test here ever touches. Concretely the
// protected roots are every top-level entry of `tools/generator-platform/`
// except `.stack-test-runtime`: `core/`, `renderers/`, `profiles/`,
// `adapters/`, `schemas/`, `manifests/`, `contracts/`, `policies/`,
// `sources/`, `acceptance/`, `fixtures/`, `test-support/`, `stack-tests/`,
// and every `*.mjs`/`*.json` file directly under `tools/generator-platform/`
// (including `check-evolvable-composition.mjs`, `render-targets.mjs`,
// `workflow-targets.mjs`, `generate-action-request.mjs`,
// `generate-workflow-action.mjs`, `validate-ir.mjs`). This is intentionally
// broader than the contract's four named nouns: it protects the whole
// generator-platform source tree, because a bug that corrupts "core" could
// just as easily corrupt a schema or a fixture, and the contract's intent —
// "the evolution run does not modify the platform" — is best served by not
// pre-deciding which sub-area a future bug would land in.
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
export const generatorPlatformRoot = resolve(moduleDirectory, '..');

const excludedTopLevelEntries = new Set(['.stack-test-runtime']);

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

async function listFilesRecursively(root) {
    const results = [];
    async function walk(currentDirectory) {
        const entries = await readdir(currentDirectory, {
            withFileTypes: true,
        });
        for (const entry of entries.sort((left, right) =>
            left.name.localeCompare(right.name)
        )) {
            const absolutePath = resolve(currentDirectory, entry.name);
            if (
                currentDirectory === root &&
                excludedTopLevelEntries.has(entry.name)
            ) {
                continue;
            }
            if (entry.isDirectory()) {
                await walk(absolutePath);
                continue;
            }
            if (entry.isFile()) {
                results.push(absolutePath);
            }
        }
    }
    await walk(root);
    return results;
}

/**
 * Hashes every byte of every file under `root` (recursively), excluding the
 * known gitignored scratch directory. Returns a Map keyed by path relative
 * to `root` so the snapshot is stable across environments.
 */
export async function snapshotProtectedTree(root = generatorPlatformRoot) {
    const files = await listFilesRecursively(root);
    const snapshot = new Map();
    for (const absolutePath of files) {
        const content = await readFile(absolutePath);
        snapshot.set(relative(root, absolutePath), {
            sha256: sha256(content),
            bytes: content.byteLength,
        });
    }
    return snapshot;
}

/**
 * Diffs two snapshots produced by snapshotProtectedTree. Returns an array of
 * human-readable violation descriptions; empty means no difference was
 * observed. Detects added files, removed files, and any file whose content
 * hash changed — a single flipped byte anywhere is enough to be reported.
 */
export function diffProtectedTreeSnapshots(before, after) {
    const violations = [];
    for (const [path, beforeEntry] of before) {
        const afterEntry = after.get(path);
        if (!afterEntry) {
            violations.push(`removed: ${path}`);
            continue;
        }
        if (afterEntry.sha256 !== beforeEntry.sha256) {
            violations.push(
                `modified: ${path} (sha256 ${beforeEntry.sha256} -> ${afterEntry.sha256}, ${beforeEntry.bytes} -> ${afterEntry.bytes} bytes)`
            );
        }
    }
    for (const path of after.keys()) {
        if (!before.has(path)) {
            violations.push(`added: ${path}`);
        }
    }
    return violations.sort();
}

/**
 * Runs `run()` for real and asserts that not a single byte changed under the
 * protected generator-platform source tree while it executed. `run` may be
 * async and may return any value, which is passed through on success.
 *
 * `root` is overridable (used by the negative test below to point the
 * oracle at an isolated fixture tree instead of the real source tree, so the
 * mutant can safely corrupt a file without touching this repository).
 */
export async function assertRunIsolation(
    run,
    { root = generatorPlatformRoot } = {}
) {
    const before = await snapshotProtectedTree(root);
    const result = await run();
    const after = await snapshotProtectedTree(root);
    const violations = diffProtectedTreeSnapshots(before, after);
    if (violations.length > 0) {
        throw new Error(
            `run isolation violated: the evolution run modified ${violations.length} file(s) under the protected generator-platform tree (core, planner, profiles, renderers):\n${violations.join('\n')}`
        );
    }
    return { result, filesChecked: before.size };
}
