import { sha256, stableStringify } from './generation-manifest.mjs';

/**
 * Axe `layer` (2026-08-28, préparation ADR-0003 §5d) — quelle couche Nx
 * (domain/data/application) porte cette responsabilité
 * dans une future sortie en couches. N'affecte encore AUCUN comportement :
 * les renderers continuent de produire une sortie plate à ce stade (étape 1
 * du chantier « générateur en couches » — voir le plan associé). Champ
 * purement descriptif, vérifié par assertArtifactPlan, ignoré par
 * bindRenderedArtifacts et les renderers.
 *
 * - 'domain'      : types + règles de validation, zéro import framework.
 * - 'data'        : accès HTTP/transport (implémente le port du domain).
 * - 'application' : orchestration, points d'extension, câblage runtime.
 * - 'per-layer'   : la responsabilité existe une fois PAR couche produite
 *   (chaque lib a son propre project.json/tsconfig.json/index.ts) — pas une
 *   seule couche cible unique. Résolu concrètement à l'étape où le plan se
 *   scinde réellement en sous-plans par package (étape 3 du chantier).
 */
export const LAYERS = new Set(['domain', 'data', 'application', 'per-layer']);

function generated(id, layer, dependsOn = []) {
    return {
        id,
        responsibility: id,
        owner: 'generator-owned',
        write_policy: 'replace',
        layer,
        depends_on: dependsOn,
    };
}

function human(id, layer, dependsOn = []) {
    return {
        id,
        responsibility: id,
        owner: 'human-owned',
        write_policy: 'preserve',
        layer,
        depends_on: dependsOn,
    };
}

const catalogs = {
    'semantic-model': [
        generated('package-descriptor', 'per-layer'),
        generated('compiler-configuration', 'per-layer'),
        generated('domain-model', 'domain'),
        generated('input-validator', 'domain', ['domain-model']),
        generated('integration-client', 'data', ['domain-model']),
        generated('extension-contract', 'application', ['domain-model']),
        human('after-success-extension', 'application', ['extension-contract']),
        generated('runtime-binding', 'application', [
            'domain-model',
            'integration-client',
            'extension-contract',
            'after-success-extension',
        ]),
        generated('public-api', 'per-layer', [
            'domain-model',
            'input-validator',
            'integration-client',
            'extension-contract',
            'after-success-extension',
            'runtime-binding',
        ]),
    ],
    'behavior-model': [
        generated('package-descriptor', 'per-layer'),
        generated('compiler-configuration', 'per-layer'),
        generated('domain-model', 'domain'),
        generated('execution-controller', 'application', ['domain-model']),
        generated('extension-contract', 'application', ['domain-model']),
        human('after-success-extension', 'application', ['extension-contract']),
        generated('runtime-binding', 'application', [
            'domain-model',
            'execution-controller',
            'extension-contract',
            'after-success-extension',
        ]),
        generated('public-api', 'per-layer', [
            'domain-model',
            'execution-controller',
            'extension-contract',
            'after-success-extension',
            'runtime-binding',
        ]),
    ],
};

function modelId(model, kind) {
    if (kind === 'semantic-model') return model.model_id;
    return `behavior:${model.domain?.id}`;
}

function assert(condition, message) {
    if (!condition) throw new Error(`artifact plan: ${message}`);
}

export function buildArtifactPlan(model, kind) {
    const catalog = catalogs[kind];
    assert(catalog, `unsupported input kind ${kind}`);
    const inputModelId = modelId(model, kind);
    assert(
        typeof inputModelId === 'string' && !inputModelId.endsWith('undefined'),
        `${kind} has no stable model id`
    );
    const artifacts = structuredClone(catalog);
    return {
        schema_version: '1.0.0',
        plan_id: `${inputModelId}:artifacts`,
        input: {
            kind,
            model_id: inputModelId,
            sha256: sha256(stableStringify(model)),
        },
        artifacts,
    };
}

export function assertArtifactPlan(plan, model, kind) {
    assert(plan?.schema_version === '1.0.0', 'unsupported schema version');
    assert(plan.input?.kind === kind, `expected ${kind} input`);
    assert(plan.input.model_id === modelId(model, kind), 'model id mismatch');
    assert(
        plan.input.sha256 === sha256(stableStringify(model)),
        'model hash mismatch'
    );
    const expected = catalogs[kind].map(({ id }) => id).sort();
    const actual = plan.artifacts.map(({ id }) => id).sort();
    assert(
        JSON.stringify(actual) === JSON.stringify(expected),
        `responsibilities mismatch: expected ${expected.join(', ')}`
    );
    const ids = new Set(actual);
    const expectedById = new Map(
        catalogs[kind].map((artifact) => [artifact.id, artifact])
    );
    for (const artifact of plan.artifacts) {
        const expectedArtifact = expectedById.get(artifact.id);
        assert(artifact.id === artifact.responsibility, `${artifact.id}: id`);
        assert(
            artifact.owner === expectedArtifact.owner,
            `${artifact.id}: owner`
        );
        assert(
            artifact.write_policy === expectedArtifact.write_policy,
            `${artifact.id}: policy`
        );
        assert(LAYERS.has(artifact.layer), `${artifact.id}: unknown layer`);
        assert(
            artifact.layer === expectedArtifact.layer,
            `${artifact.id}: layer`
        );
        for (const dependency of artifact.depends_on) {
            assert(ids.has(dependency), `${artifact.id}: unknown dependency`);
        }
    }
}

export function bindRenderedArtifacts(plan, files, bindings) {
    const planned = new Set(plan.artifacts.map(({ id }) => id));
    const paths = Object.keys(files).sort();
    const boundPaths = Object.keys(bindings).sort();
    assert(
        JSON.stringify(paths) === JSON.stringify(boundPaths),
        'renderer bindings must cover every file exactly once'
    );
    const used = new Set();
    const artifacts = paths.map((path) => {
        const artifactId = bindings[path];
        assert(planned.has(artifactId), `${path}: unplanned ${artifactId}`);
        used.add(artifactId);
        return { path, artifact_id: artifactId };
    });
    for (const artifactId of planned) {
        assert(used.has(artifactId), `${artifactId}: not materialized`);
    }
    return { files, artifacts };
}
