import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const REGISTRY_PATH = 'tools/generator-platform/composition-registry.json';
const ALLOWED_LAYERS = ['domain', 'data', 'application'];

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
                  'kind',
                  'maturity',
                  'maturity_note',
                  'target',
                  'generator_script',
                  'layers',
                  'evidence',
              ]
            : [
                  'kind',
                  'maturity',
                  'target',
                  'generator_script',
                  'layers',
                  'evidence',
              ],
        label
    );
    if (!/^[a-z][a-z0-9-]*$/.test(composition.kind ?? ''))
        fail(`${label}.kind must be kebab-case`);
    if (
        composition.maturity === 'experimental' &&
        (typeof composition.maturity_note !== 'string' ||
            composition.maturity_note.trim().length === 0)
    )
        fail(`${label}.maturity_note must explain the experimental limit`);
    if (composition.target !== 'angular-layered')
        fail(`${label}.target is unsupported: ${composition.target}`);
    regularWorkspaceFile(
        workspaceRoot,
        composition.generator_script,
        `${label}.generator_script`
    );
    if (
        !Array.isArray(composition.layers) ||
        composition.layers.length === 0 ||
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
        const featureId = definition.feature?.id;
        if (!/^[a-z][a-z0-9-]*$/.test(featureId ?? ''))
            fail(`${evidenceLabel} has no valid feature.id`);
        if (featureIds.has(featureId))
            fail(`${label}.evidence repeats feature.id ${featureId}`);
        featureIds.add(featureId);
    }
    return Object.freeze({
        kind: composition.kind,
        maturity: composition.maturity,
        maturityNote: composition.maturity_note ?? null,
        target: composition.target,
        generatorScript: composition.generator_script,
        layers: Object.freeze([...composition.layers]),
        evidence: Object.freeze([...composition.evidence]),
    });
}

export function validateCompositionRegistry(workspaceRoot, document) {
    exactKeys(document, ['schema_version', 'compositions'], 'document');
    if (document.schema_version !== '1.0.0')
        fail('schema_version must be 1.0.0');
    if (
        !Array.isArray(document.compositions) ||
        document.compositions.length === 0
    )
        fail('compositions must be a non-empty array');
    const entries = document.compositions.map((entry, index) =>
        validateComposition(workspaceRoot, entry, index)
    );
    const kinds = entries.map(({ kind }) => kind);
    if (new Set(kinds).size !== kinds.length)
        fail('composition kinds must be unique');
    if (JSON.stringify(kinds) !== JSON.stringify([...kinds].sort()))
        fail('compositions must be sorted by kind');
    return Object.freeze({
        schemaVersion: document.schema_version,
        entries: Object.freeze(entries),
        byKind: Object.freeze(
            Object.fromEntries(entries.map((entry) => [entry.kind, entry]))
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
