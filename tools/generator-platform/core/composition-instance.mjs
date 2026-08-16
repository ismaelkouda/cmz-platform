import { sha256, stableStringify } from './generation-manifest.mjs';
import { validateJsonSchema } from '../validate-ir.mjs';

// A persisted composition instance (ADR-0032, Option C). This module is
// deliberately narrow: it only proves that one evolved composition can be
// written down, reloaded and regenerated without drifting from the original
// render. It never extracts invariants, never assigns a reusable name beyond
// an opaque instance id, and never writes to any catalog. Promoting an
// instance to a named pattern is a separate act with its own governance and
// is out of scope here — see ADR-0032 "Justification" and "Conséquences".

const schemaVersion = '1.0.0';

function fail(message) {
    throw new Error(`composition instance: ${message}`);
}

function targetSnapshot(target) {
    return {
        profile_id: target.manifest.target.profile_id,
        manifest_tree_sha256: target.manifest.tree_sha256,
        manifest_input_sha256: target.manifest.input.sha256,
    };
}

function envelopeWithoutIntegrity(instance) {
    const rest = { ...instance };
    delete rest.integrity;
    return rest;
}

/**
 * Builds the persistable envelope for one evolved composition. This is a
 * pure function: given the same inputs it always produces the same bytes,
 * which is what lets `reloadAndRegenerate` prove determinism.
 */
export function buildCompositionInstance({
    instanceId,
    recordedAt,
    definitionUri,
    definitionSha256,
    contractId,
    projectedDefinition,
    targets,
}) {
    if (!instanceId || typeof instanceId !== 'string') {
        fail('instanceId is required');
    }
    if (!recordedAt || typeof recordedAt !== 'string') {
        fail('recordedAt is required');
    }
    const envelope = {
        schema_version: schemaVersion,
        kind: 'composition-instance',
        instance_id: instanceId,
        recorded_at: recordedAt,
        source: {
            definition_uri: definitionUri,
            definition_sha256: definitionSha256,
        },
        contract_ref: { contract_id: contractId },
        projected_definition: projectedDefinition,
        targets: {
            angular: targetSnapshot(targets.angular),
            reactjs: targetSnapshot(targets.react),
        },
    };
    const envelope_sha256 = sha256(stableStringify(envelope));
    return {
        ...envelope,
        integrity: {
            algorithm: 'sha256-stable-json-v1',
            envelope_sha256,
        },
    };
}

/**
 * Fail-closed structural + integrity verification of a persisted instance.
 * Returns the list of problems found; an empty list means the envelope is
 * internally consistent (schema-valid and self-hash matches). This does NOT
 * verify that regeneration reproduces the same renderer output — that is a
 * separate, stronger check performed by `reloadAndRegenerate` because it
 * requires actually re-running the compiler and both renderers.
 */
export function verifyCompositionInstanceIntegrity(instance, schema) {
    const errors = validateJsonSchema(instance, schema);
    if (errors.length > 0) return errors;
    const expected = sha256(
        stableStringify(envelopeWithoutIntegrity(instance))
    );
    if (instance.integrity.envelope_sha256 !== expected) {
        return [
            `integrity.envelope_sha256: mismatch; expected ${expected}, received ${instance.integrity.envelope_sha256}`,
        ];
    }
    return [];
}

/**
 * Reloads a persisted instance and fails closed on any corruption: schema
 * violations, a tampered self-hash, or an unknown contract reference all
 * throw before any generation is attempted. There is no silent fallback to
 * "generate anyway" on invalid data.
 */
export function assertValidCompositionInstance(
    instance,
    schema,
    { contractId } = {}
) {
    const errors = verifyCompositionInstanceIntegrity(instance, schema);
    if (errors.length > 0) {
        fail(
            `invalid or corrupted instance; refusing to regenerate: ${errors.join('; ')}`
        );
    }
    if (
        contractId !== undefined &&
        instance.contract_ref.contract_id !== contractId
    ) {
        fail(
            `contract mismatch; instance was recorded for ${instance.contract_ref.contract_id}, expected ${contractId}`
        );
    }
    return instance;
}

/**
 * Reloads a persisted instance and regenerates both targets from its exact
 * `projected_definition` payload (never from the live contract), then proves
 * hash-identity against the tree hashes captured at persistence time. A
 * mismatch — whether from a tampered instance or from a renderer/compiler
 * that silently changed behavior — throws instead of returning a divergent
 * result.
 */
export async function reloadAndRegenerate(
    instance,
    schema,
    { contractId, computeTargetsForDefinition }
) {
    assertValidCompositionInstance(instance, schema, { contractId });
    const targets = await computeTargetsForDefinition(
        instance.projected_definition
    );
    const regenerated = {
        angular: targetSnapshot(targets.angular),
        reactjs: targetSnapshot(targets.react),
    };
    const mismatches = ['angular', 'reactjs'].filter(
        (id) =>
            regenerated[id].manifest_tree_sha256 !==
            instance.targets[id].manifest_tree_sha256
    );
    if (mismatches.length > 0) {
        fail(
            `regeneration diverged from the persisted instance for ${mismatches.join(', ')}; refusing to return a drifted result`
        );
    }
    return { targets, regenerated };
}
