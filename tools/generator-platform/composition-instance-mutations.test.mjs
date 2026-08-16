import assert from 'node:assert/strict';
import {
    mkdir,
    mkdtemp,
    readFile,
    rm,
    symlink,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import {
    buildCompositionInstance,
    reloadAndRegenerate,
} from './core/composition-instance.mjs';
import {
    buildSupportedProjection,
    computeEvolvableCompositionTargets,
    directorContractPath,
} from './check-evolvable-composition.mjs';
import { computeTargetsForSemantic } from './render-targets.mjs';
import { loadJson, repositoryRoot } from './validate-ir.mjs';

// This suite proves the fail-closed guards in core/composition-instance.mjs
// are load-bearing: for each mutant, the ORIGINAL module rejects the
// corrupted scenario, and the MUTATED module (with the guard neutralized)
// accepts it. If a mutant survived (both versions rejected, or both
// accepted), the guard it targets would not actually be tested by
// composition-instance.test.mjs.

const sourcePath = new URL('core/composition-instance.mjs', import.meta.url);

const mutants = [
    {
        name: 'self-hash mismatch guard neutralisé',
        before: 'instance.integrity.envelope_sha256 !== expected',
        after: 'false',
    },
    {
        name: 'contract mismatch guard neutralisé',
        before: 'instance.contract_ref.contract_id !== contractId',
        after: 'false',
    },
    {
        name: 'divergence de régénération neutralisée',
        before: 'mismatches.length > 0',
        after: 'false',
    },
];

// Mutants are written to a mkdtemp root, never into the real
// tools/generator-platform source tree: run-isolation-oracle.mjs (PLAT-5K)
// hashes every byte under that tree before and after a director-gate run
// and fails on any change, so a mutant that briefly existed as a sibling of
// composition-instance.mjs — even if cleaned up in a `finally` — would be a
// genuine (if transient) violation of invariant #6 if the director gate ran
// concurrently with this suite under `node --test`'s default parallelism.
// The mutant's relative imports (./generation-manifest.mjs,
// ../validate-ir.mjs) are preserved by symlinking those two files, which
// themselves have no further relative imports, into the same relative
// layout under the temporary root.
async function loadMutant(mutant) {
    const original = await readFile(sourcePath, 'utf8');
    assert.ok(
        original.includes(mutant.before),
        `${mutant.name}: mutation point absent from the source`
    );
    const mutated = original.replace(mutant.before, mutant.after);
    assert.notEqual(
        mutated,
        original,
        `${mutant.name}: mutation had no effect`
    );
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-composition-instance-mutant-')
    );
    const temporaryCore = resolve(temporaryRoot, 'core');
    await mkdir(temporaryCore, { recursive: true });
    await symlink(
        resolve(
            repositoryRoot,
            'tools/generator-platform/core/generation-manifest.mjs'
        ),
        resolve(temporaryCore, 'generation-manifest.mjs')
    );
    await symlink(
        resolve(repositoryRoot, 'tools/generator-platform/validate-ir.mjs'),
        resolve(temporaryRoot, 'validate-ir.mjs')
    );
    const path = resolve(
        temporaryCore,
        `composition-instance.mutant.${mutant.name.replace(/\W+/g, '-')}.mjs`
    );
    await writeFile(path, mutated);
    return {
        module: await import(pathToFileURL(path).href),
        root: temporaryRoot,
    };
}

async function buildFixture() {
    const contract = await loadJson(directorContractPath);
    const definitionPath = resolve(repositoryRoot, contract.source.definition);
    const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
    const projected = buildSupportedProjection(definition, contract);
    const { targets } = await computeEvolvableCompositionTargets();
    const computeTargetsForDefinition = async (candidate) => {
        const recompiled = compileActionRequestDefinition(candidate, {
            sourceUri: contract.source.definition,
            sourceSha256: 'a'.repeat(64),
        });
        return computeTargetsForSemantic(recompiled.semantic);
    };
    const instance = buildCompositionInstance({
        instanceId: 'instance.contact-support-action-request-semantic',
        recordedAt: '2026-08-16T00:00:00.000Z',
        definitionUri: contract.source.definition,
        definitionSha256: 'a'.repeat(64),
        contractId: contract.contract_id,
        projectedDefinition: projected,
        targets,
    });
    return { computeTargetsForDefinition, contract, instance };
}

function flip(hash) {
    return hash.slice(0, -1) + (hash.at(-1) === '0' ? '1' : '0');
}

const scenarios = {
    async 'self-hash mismatch guard neutralisé'({ instance }) {
        // Mutate metadata that is part of the hashed envelope but plays no
        // role in regeneration (recorded_at), so only the self-hash guard —
        // not the regeneration-divergence guard — can catch this. The
        // integrity envelope hash is deliberately left stale.
        return { ...instance, recorded_at: '2099-01-01T00:00:00.000Z' };
    },
    async 'contract mismatch guard neutralisé'({ instance }) {
        return instance;
    },
    async 'divergence de régénération neutralisée'({ instance }) {
        // A validly re-signed envelope (self-hash intact) whose recorded
        // Angular tree hash was flipped: only the regeneration cross-check
        // can catch this, because integrity verification alone considers it
        // consistent.
        return buildCompositionInstance({
            instanceId: instance.instance_id,
            recordedAt: instance.recorded_at,
            definitionUri: instance.source.definition_uri,
            definitionSha256: instance.source.definition_sha256,
            contractId: instance.contract_ref.contract_id,
            projectedDefinition: instance.projected_definition,
            targets: {
                angular: {
                    manifest: {
                        target: { profile_id: 'angular-nx' },
                        tree_sha256: flip(
                            instance.targets.angular.manifest_tree_sha256
                        ),
                        input: {
                            sha256: instance.targets.angular
                                .manifest_input_sha256,
                        },
                    },
                },
                react: {
                    manifest: {
                        target: { profile_id: 'react-typescript' },
                        tree_sha256:
                            instance.targets.reactjs.manifest_tree_sha256,
                        input: {
                            sha256: instance.targets.reactjs
                                .manifest_input_sha256,
                        },
                    },
                },
            },
        });
    },
};

test('mutants against composition-instance guards are killed', async (t) => {
    const schema = await loadJson(
        new URL('schemas/composition-instance.schema.json', import.meta.url)
    );
    const writtenMutantRoots = [];
    try {
        const { computeTargetsForDefinition, contract, instance } =
            await buildFixture();

        for (const mutant of mutants) {
            await t.test(mutant.name, async () => {
                const badInstanceFactory = scenarios[mutant.name];
                const contractIdArgument =
                    mutant.name === 'contract mismatch guard neutralisé'
                        ? 'director.some-other-contract'
                        : contract.contract_id;
                const badInstance = await badInstanceFactory({ instance });

                // The original module must reject this scenario.
                await assert.rejects(
                    () =>
                        reloadAndRegenerate(badInstance, schema, {
                            contractId: contractIdArgument,
                            computeTargetsForDefinition,
                        }),
                    `${mutant.name}: original module should have rejected`
                );

                // The mutated module — with the corresponding guard
                // neutralized — must accept the same scenario, proving the
                // guard (and therefore the test coverage of it) is
                // load-bearing.
                const { module: mutatedModule, root } =
                    await loadMutant(mutant);
                writtenMutantRoots.push(root);
                await assert.doesNotReject(
                    () =>
                        mutatedModule.reloadAndRegenerate(badInstance, schema, {
                            contractId: contractIdArgument,
                            computeTargetsForDefinition,
                        }),
                    `${mutant.name}: mutant should have survived without the guard`
                );
            });
        }
    } finally {
        await Promise.all(
            writtenMutantRoots.map((root) =>
                rm(root, { recursive: true, force: true })
            )
        );
    }
});
