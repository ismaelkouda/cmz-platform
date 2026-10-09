import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const REGISTRY_PATH = 'tools/generator-platform/composition-registry.json';
const ALLOWED_LAYERS = ['domain', 'data', 'application'];
const ALLOWED_OUTPUT_MODELS = ['layered', 'target-native'];
const ALLOWED_TARGETS = ['angular-layered', 'angular-nx', 'react-typescript'];
const ALLOWED_ORACLE_SCOPES = ['isolated', 'composed-page'];
const TARGET_ORACLE_PATTERNS = Object.freeze({
    'angular-nx': /(?:-angular\.test\.mjs|\/stack-tests\/angular\/)/,
    'react-typescript': /(?:-react\.test\.mjs|\/stack-tests\/reactjs\/)/,
});

function fail(message) {
    throw new Error(`composition registry: ${message}`);
}

function exactKeys(value, keys, label) {
    if (
        value === null ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        Object.keys(value).sort().join('\0') !== [...keys].sort().join('\0')
    )
        fail(`${label} must contain exactly: ${keys.join(', ')}`);
}

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === 'object')
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, canonical(value[key])])
        );
    return value;
}

export function compositionSha256(composition) {
    return createHash('sha256')
        .update(JSON.stringify(canonical(composition)))
        .digest('hex');
}

function regularWorkspaceFile(workspaceRoot, relativePath, label) {
    if (
        typeof relativePath !== 'string' ||
        relativePath.length === 0 ||
        relativePath.includes('\\')
    )
        fail(`${label} must be a non-empty POSIX workspace path`);
    const root = realpathSync(workspaceRoot);
    const absolute = resolve(root, relativePath);
    if (absolute !== root && !absolute.startsWith(`${root}${sep}`))
        fail(`${label} escapes the workspace: ${relativePath}`);
    let cursor = absolute;
    while (cursor !== root) {
        const metadata = lstatSync(cursor);
        if (metadata.isSymbolicLink())
            fail(`${label} traverses a symbolic link: ${relativePath}`);
        cursor = dirname(cursor);
    }
    const metadata = lstatSync(absolute);
    if (!metadata.isFile()) fail(`${label} is not a regular file`);
    return absolute;
}

function validateComposition(workspaceRoot, composition, index) {
    const label = `compositions[${index}]`;
    if (
        composition === null ||
        typeof composition !== 'object' ||
        Array.isArray(composition)
    )
        fail(`${label} must be an object`);
    if (!['experimental', 'proven'].includes(composition.maturity))
        fail(`${label}.maturity must be experimental or proven`);
    exactKeys(
        composition,
        composition.maturity === 'experimental'
            ? [
                  'id',
                  'kind',
                  'contract_version',
                  'maturity',
                  'maturity_note',
                  'resume_compatible_sha256',
                  'target',
                  'output_model',
                  'generator_script',
                  'layers',
                  'evidence',
                  'oracles',
              ]
            : [
                  'id',
                  'kind',
                  'contract_version',
                  'maturity',
                  'target',
                  'output_model',
                  'generator_script',
                  'layers',
                  'evidence',
                  'oracles',
              ],
        label
    );
    if (!/^[a-z][a-z0-9-]*$/.test(composition.id ?? ''))
        fail(`${label}.id must be kebab-case`);
    if (!/^[a-z][a-z0-9-]*$/.test(composition.kind ?? ''))
        fail(`${label}.kind must be kebab-case`);
    if (!/^\d+\.\d+\.\d+$/.test(composition.contract_version ?? ''))
        fail(`${label}.contract_version must be semantic x.y.z`);
    if (
        composition.maturity === 'experimental' &&
        (typeof composition.maturity_note !== 'string' ||
            composition.maturity_note.trim().length === 0)
    )
        fail(`${label}.maturity_note must explain the experimental limit`);
    const resumeCompatibleSha256 = composition.resume_compatible_sha256 ?? [];
    if (
        !Array.isArray(resumeCompatibleSha256) ||
        new Set(resumeCompatibleSha256).size !==
            resumeCompatibleSha256.length ||
        resumeCompatibleSha256.some(
            (hash) => !/^[a-f0-9]{64}$/.test(hash ?? '')
        )
    )
        fail(
            `${label}.resume_compatible_sha256 must contain unique sha256 values`
        );
    if (!ALLOWED_TARGETS.includes(composition.target))
        fail(`${label}.target is unsupported: ${composition.target}`);
    if (!ALLOWED_OUTPUT_MODELS.includes(composition.output_model))
        fail(
            `${label}.output_model must be one of: ${ALLOWED_OUTPUT_MODELS.join(', ')}`
        );
    if (
        (composition.output_model === 'layered') !==
        (composition.target === 'angular-layered')
    )
        fail(`${label}.output_model is incompatible with its target`);
    regularWorkspaceFile(
        workspaceRoot,
        composition.generator_script,
        `${label}.generator_script`
    );
    if (
        !Array.isArray(composition.layers) ||
        new Set(composition.layers).size !== composition.layers.length ||
        composition.layers.some((layer) => !ALLOWED_LAYERS.includes(layer)) ||
        composition.layers.some(
            (layer, layerIndex) =>
                ALLOWED_LAYERS.indexOf(layer) <=
                ALLOWED_LAYERS.indexOf(composition.layers[layerIndex - 1])
        )
    )
        fail(`${label}.layers must be a unique canonical layer prefix`);
    if (
        composition.output_model === 'layered' &&
        composition.layers.length === 0
    )
        fail(`${label}.layered output requires at least one layer`);
    if (
        composition.output_model === 'target-native' &&
        composition.layers.length !== 0
    )
        fail(`${label}.target-native output must not declare legacy layers`);
    if (
        resumeCompatibleSha256.length > 0 &&
        (composition.maturity !== 'experimental' ||
            composition.output_model !== 'layered')
    )
        fail(
            `${label}.resume_compatible_sha256 is reserved for experimental layered journal compatibility`
        );
    if (
        composition.layers.includes('application') &&
        !composition.layers.includes('data')
    )
        fail(`${label}.application requires data`);
    const minimumEvidence = composition.maturity === 'proven' ? 2 : 1;
    if (
        !Array.isArray(composition.evidence) ||
        composition.evidence.length < minimumEvidence ||
        new Set(composition.evidence).size !== composition.evidence.length
    )
        fail(`${label}.evidence requires ${minimumEvidence} distinct case(s)`);
    const featureIds = new Set();
    for (const [
        evidenceIndex,
        evidencePath,
    ] of composition.evidence.entries()) {
        const evidenceLabel = `${label}.evidence[${evidenceIndex}]`;
        const absolute = regularWorkspaceFile(
            workspaceRoot,
            evidencePath,
            evidenceLabel
        );
        let definition;
        try {
            definition = JSON.parse(readFileSync(absolute, 'utf8'));
        } catch (error) {
            fail(`${evidenceLabel} is invalid JSON: ${error.message}`);
        }
        if (definition.kind !== composition.kind)
            fail(`${evidenceLabel} does not prove kind ${composition.kind}`);
        if (definition.schema_version !== composition.contract_version)
            fail(
                `${evidenceLabel} uses contract ${definition.schema_version ?? 'unknown'} instead of ${composition.contract_version}`
            );
        const featureId = definition.feature?.id;
        if (!/^[a-z][a-z0-9-]*$/.test(featureId ?? ''))
            fail(`${evidenceLabel} has no valid feature.id`);
        if (featureIds.has(featureId))
            fail(`${label}.evidence repeats feature.id ${featureId}`);
        featureIds.add(featureId);
    }
    if (!Array.isArray(composition.oracles) || composition.oracles.length === 0)
        fail(`${label}.oracles requires at least one target oracle`);
    const oraclePaths = new Set();
    const oracleScopes = new Set();
    for (const [oracleIndex, oracle] of composition.oracles.entries()) {
        const oracleLabel = `${label}.oracles[${oracleIndex}]`;
        exactKeys(oracle, ['path', 'scope', 'sha256'], oracleLabel);
        if (!ALLOWED_ORACLE_SCOPES.includes(oracle.scope))
            fail(
                `${oracleLabel}.scope must be one of: ${ALLOWED_ORACLE_SCOPES.join(', ')}`
            );
        const oraclePath = regularWorkspaceFile(
            workspaceRoot,
            oracle.path,
            `${oracleLabel}.path`
        );
        if (!/^[a-f0-9]{64}$/.test(oracle.sha256 ?? ''))
            fail(`${oracleLabel}.sha256 must be a sha256 value`);
        const oracleContent = readFileSync(oraclePath, 'utf8');
        const oracleSha256 = createHash('sha256')
            .update(oracleContent)
            .digest('hex');
        if (oracleSha256 !== oracle.sha256)
            fail(`${oracleLabel}.sha256 does not match ${oracle.path}`);
        if (!/\b(?:it|test)\s*\(/.test(oracleContent))
            fail(`${oracleLabel}.path contains no executable test declaration`);
        const targetPattern = TARGET_ORACLE_PATTERNS[composition.target];
        if (targetPattern && !targetPattern.test(oracle.path))
            fail(
                `${oracleLabel}.path does not belong to target ${composition.target}`
            );
        if (oraclePaths.has(oracle.path))
            fail(`${label}.oracles repeats path ${oracle.path}`);
        oraclePaths.add(oracle.path);
        oracleScopes.add(oracle.scope);
    }
    if (
        composition.maturity === 'proven' &&
        (!oracleScopes.has('isolated') || !oracleScopes.has('composed-page'))
    )
        fail(
            `${label}.proven requires isolated and composed-page target oracles`
        );
    return Object.freeze({
        id: composition.id,
        kind: composition.kind,
        contractVersion: composition.contract_version,
        maturity: composition.maturity,
        maturityNote: composition.maturity_note ?? null,
        target: composition.target,
        outputModel: composition.output_model,
        resumeCompatibleSha256: Object.freeze([...resumeCompatibleSha256]),
        generatorScript: composition.generator_script,
        layers: Object.freeze([...composition.layers]),
        evidence: Object.freeze([...composition.evidence]),
        oracles: Object.freeze(
            composition.oracles.map((oracle) => Object.freeze({ ...oracle }))
        ),
    });
}

export function validateCompositionRegistry(workspaceRoot, document) {
    exactKeys(document, ['schema_version', 'compositions'], 'document');
    if (document.schema_version !== '2.0.0')
        fail('schema_version must be 2.0.0');
    if (
        !Array.isArray(document.compositions) ||
        document.compositions.length === 0
    )
        fail('compositions must be a non-empty array');
    const entries = document.compositions.map((entry, index) =>
        validateComposition(workspaceRoot, entry, index)
    );
    const ids = entries.map(({ id }) => id);
    if (new Set(ids).size !== ids.length)
        fail('composition ids must be unique');
    if (JSON.stringify(ids) !== JSON.stringify([...ids].sort()))
        fail('compositions must be sorted by id');
    const coordinates = entries.map(
        ({ kind, contractVersion, target }) =>
            `${kind}@${contractVersion}:${target}`
    );
    if (new Set(coordinates).size !== coordinates.length)
        fail('composition kind/version/target coordinates must be unique');
    const legacyEntries = entries.filter(
        ({ contractVersion, target, outputModel }) =>
            contractVersion === '1.0.0' &&
            target === 'angular-layered' &&
            outputModel === 'layered'
    );
    const legacyByKind = Object.fromEntries(
        legacyEntries.map((entry) => [
            entry.kind,
            Object.freeze({
                kind: entry.kind,
                maturity: entry.maturity,
                maturityNote: entry.maturityNote,
                target: entry.target,
                generatorScript: entry.generatorScript,
                layers: entry.layers,
                evidence: entry.evidence,
            }),
        ])
    );
    const resumeCompatibleSha256ByKind = Object.fromEntries(
        legacyEntries.map((entry) => [entry.kind, entry.resumeCompatibleSha256])
    );
    return Object.freeze({
        schemaVersion: document.schema_version,
        entries: Object.freeze(entries),
        byId: Object.freeze(
            Object.fromEntries(entries.map((entry) => [entry.id, entry]))
        ),
        byCoordinates: Object.freeze(
            Object.fromEntries(
                entries.map((entry) => [
                    `${entry.kind}@${entry.contractVersion}:${entry.target}`,
                    entry,
                ])
            )
        ),
        // create-module remains the explicit consumer of the frozen v1 layered
        // path and its v1 state shape. New target-native entries are never
        // selected implicitly and cannot invalidate a resumable v1 journal.
        byKind: Object.freeze(legacyByKind),
        resumeCompatibleSha256ByKind: Object.freeze(
            resumeCompatibleSha256ByKind
        ),
    });
}

export function loadCompositionRegistry(workspaceRoot) {
    const absolute = regularWorkspaceFile(
        workspaceRoot,
        REGISTRY_PATH,
        'registry'
    );
    let document;
    try {
        document = JSON.parse(readFileSync(absolute, 'utf8'));
    } catch (error) {
        fail(`registry is invalid JSON: ${error.message}`);
    }
    return validateCompositionRegistry(workspaceRoot, document);
}

export function registryPath(workspaceRoot) {
    return relative(workspaceRoot, join(workspaceRoot, REGISTRY_PATH));
}
