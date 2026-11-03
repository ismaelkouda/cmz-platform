import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, resolve, sep } from 'node:path';

import { isWithin, assertPhysicalPath } from './external-application-paths.mjs';
import { sha256, stableStringify } from './generation-manifest.mjs';
import {
    observationInputPrimitives as io,
    assertObservationSchema,
    observationDiagnostic,
    rejectObservation as fail,
    resolveObservationPointer as pointer,
} from './runtime-observation-evidence.mjs';

export const BACKEND_OBSERVATION_LIMITS = Object.freeze({
    sourceBytes: 1048576,
    totalSourceBytes: 2097152,
    capsuleBytes: 65536,
    tokens: 131072,
    nodes: 32768,
    depth: 32,
    stringLength: 8192,
    width: 2048,
    operations: 8,
    models: 32,
    mapEntries: 128,
});
const capsuleLimits = {
    nodes: 32768,
    depth: 32,
    stringLength: 1024,
    width: 256,
};
export const observationPointerToken = (text) =>
    text.replaceAll('~', '~0').replaceAll('/', '~1');
const own = (object, name) =>
    object && Object.hasOwn(object, name) ? object[name] : undefined;
const encode = (value) => Buffer.from(stableStringify(value) + '\n');
const unique = (values) => {
    if (new Set(values).size !== values.length) fail('OBS_IDENTITY');
};

async function privateContext(privateRoot, targetRoot, toolsRoot) {
    if (
        typeof privateRoot !== 'string' ||
        !isAbsolute(privateRoot) ||
        resolve(privateRoot) !== privateRoot ||
        privateRoot === sep
    )
        fail('OBS_ROOT');
    await assertPhysicalPath(privateRoot);
    const stat = await lstat(privateRoot);
    if (
        !stat.isDirectory() ||
        (stat.mode & 0o077) !== 0 ||
        [targetRoot, toolsRoot].some(
            (root) => isWithin(root, privateRoot) || isWithin(privateRoot, root)
        )
    )
        fail('OBS_ROOT');
    if ((await realpath(privateRoot)) !== privateRoot) fail('OBS_ROOT');
    return { root: privateRoot, identity: await io.identityChain(privateRoot) };
}

async function pinned(root, reference, cap, limits = capsuleLimits) {
    const bytes = await io.boundedFile(root, reference.path, cap);
    if (sha256(bytes) !== reference.sha256) fail('OBS_HASH');
    if (reference.bytes !== undefined && reference.bytes !== bytes.length)
        fail('OBS_HASH');
    return { bytes, value: io.parse(bytes, limits) };
}

// JSON is parsed only after the physical read cap and native resource preflight.
// Selection walks requests/security only; unrelated operations and responses are
// never projected, normalized, or copied into the public capsule.
function selectOpenApi(document, selections, basePath) {
    if (!/^3\.(?:0|1|2)\.[0-9]+$/.test(document.openapi ?? ''))
        fail('OBS_OPENAPI');
    const capsule = {
        openapi: document.openapi,
        paths: Object.create(null),
        components: Object.create(null),
    };
    const provenance = [];
    const visited = new Set();
    function reference(ref) {
        if (
            typeof ref !== 'string' ||
            !/^#\/components\/(schemas|parameters|requestBodies|securitySchemes)\/[^/]+$/.test(
                ref
            )
        )
            fail('OBS_POINTER');
        if (visited.has(ref)) return;
        if (visited.size >= 64) fail('OBS_LIMIT');
        visited.add(ref);
        const value = pointer(document, ref.slice(1));
        const [, , section, encoded] = ref.split('/');
        const name = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
        capsule.components[section] ??= Object.create(null);
        capsule.components[section][name] = clean(value);
        provenance.push(ref);
    }
    function clean(value, key = '') {
        if (Array.isArray(value))
            return value.map((child) => clean(child, key));
        if (!value || typeof value !== 'object') return value;
        const result = Object.create(null);
        const table = ['properties', 'content', 'security'].includes(key);
        for (const [name, child] of Object.entries(value)) {
            // Descriptive/raw values are not needed for structural compilation.
            if (
                !table &&
                [
                    'description',
                    'summary',
                    'title',
                    'externalDocs',
                    'example',
                    'examples',
                ].includes(name)
            )
                continue;
            if (
                !table &&
                ['default', 'enum', 'const', 'pattern'].includes(name)
            )
                fail('OBS_OPENAPI');
            if (!table && name === '$ref') reference(child);
            if (!table && name === 'servers') fail('OBS_OPENAPI');
            result[name] = clean(child, table ? '' : name);
        }
        if (key === 'schema' || (!table && Object.hasOwn(result, 'type')))
            result.description = 'Structure de source sélectionnée.';
        return result;
    }
    for (const selection of selections) {
        const item = own(document.paths, selection.source_path);
        const verb = selection.method.toLowerCase();
        const operation = own(item, verb);
        if (
            !operation ||
            item.$ref ||
            item.servers ||
            operation.servers ||
            operation.callbacks
        )
            fail('OBS_OPENAPI');
        if (selection.path !== basePath + selection.source_path)
            fail('OBS_BINDING');
        const route = observationPointerToken(selection.source_path);
        const origin = `#/paths/${route}/${verb}`;
        const selected = Object.create(null);
        // Responses are supplied by selected structural witnesses. Their status
        // must nevertheless exist in the original operation's response table.
        if (!own(operation.responses, String(selection.status)))
            fail('OBS_BINDING');
        for (const key of ['parameters', 'requestBody']) {
            if (Object.hasOwn(operation, key))
                selected[key] = clean(operation[key]);
        }
        if (Object.hasOwn(item, 'parameters')) {
            selected.parameters = [
                ...clean(item.parameters),
                ...(selected.parameters ?? []),
            ];
        }
        const requirements = Object.hasOwn(operation, 'security')
            ? operation.security
            : own(document, 'security');
        if (requirements !== undefined) {
            selected.security = clean(requirements, 'security');
            for (const requirement of requirements)
                for (const name of Object.keys(requirement))
                    reference(
                        `#/components/securitySchemes/${observationPointerToken(name)}`
                    );
        }
        selected.operationId = selection.id;
        capsule.paths[selection.source_path] ??= Object.create(null);
        capsule.paths[selection.source_path][verb] = selected;
        provenance.push(origin);
    }
    if (Object.keys(capsule.components.schemas ?? {}).length > 32)
        fail('OBS_LIMIT');
    return { document: capsule, pointers: [...new Set(provenance)].sort() };
}

function validateBinding(value, definition, openapi) {
    if (Object.keys(value).sort().join(',') !== 'alias,base_path,origin')
        fail('OBS_BINDING');
    if (
        value.alias !== definition.service.runtime_binding ||
        value.base_path !== definition.openapi.base_path
    )
        fail('OBS_BINDING');
    let origin;
    try {
        origin = new URL(value.origin);
    } catch {
        fail('OBS_BINDING');
    }
    if (
        !['http:', 'https:'].includes(origin.protocol) ||
        origin.username ||
        origin.password ||
        origin.search ||
        origin.hash ||
        origin.pathname !== '/'
    )
        fail('OBS_BINDING');
    const servers = openapi.servers;
    if (
        !Array.isArray(servers) ||
        servers.length !== 1 ||
        typeof servers[0].url !== 'string'
    )
        fail('OBS_BINDING');
    let sourceUrl;
    try {
        sourceUrl = new URL(servers[0].url);
    } catch {
        fail('OBS_BINDING');
    }
    if (
        !['http:', 'https:'].includes(sourceUrl.protocol) ||
        servers[0].variables ||
        sourceUrl.search ||
        sourceUrl.hash ||
        sourceUrl.pathname.replace(/\/$/, '') !== value.base_path
    )
        fail('OBS_BINDING');
    // Runtime origin is an explicit private binding, not guessed from the
    // documentation server origin. The source base-path remains exact.
}

function safeClaims(annotations, fragments) {
    if (!annotations.service_evidence.length) fail('OBS_COMPLEMENT');
    const byId = new Map(fragments.map((fragment) => [fragment.id, fragment]));
    const pending = [
        annotations.models,
        annotations.operations,
        annotations.service_evidence,
        annotations.security_schemes,
    ];
    while (pending.length) {
        const value = pending.pop();
        if (!value || typeof value !== 'object') continue;
        if (
            Object.hasOwn(value, 'evidence') &&
            (!Array.isArray(value.evidence) ||
                !value.evidence.length ||
                value.evidence.length > 16)
        )
            fail('OBS_COMPLEMENT');
        if (Object.hasOwn(value, 'source_id')) {
            const fragment = byId.get(value.source_id);
            const match = /^L([1-9][0-9]*)-L([1-9][0-9]*)$/.exec(value.locator);
            if (
                !fragment ||
                !match ||
                +match[1] < fragment.start_line ||
                +match[2] > fragment.end_line ||
                +match[1] > +match[2]
            )
                fail('OBS_COMPLEMENT');
        }
        // Raw descriptions and business enum values are not copied. Native
        // numeric constraints remain representable and reviewed as declarations.
        if (
            Object.hasOwn(value, 'allowed_values') ||
            value.constraints?.pattern
        )
            fail('OBS_COMPLEMENT');
        pending.push(...Object.values(value));
    }
    const scrub = (value) => {
        if (Array.isArray(value)) return value.map(scrub);
        if (!value || typeof value !== 'object') return value;
        return Object.fromEntries(
            Object.entries(value).map(([key, child]) => [
                key,
                key === 'description'
                    ? 'Déclaration structurelle sourcée.'
                    : scrub(child),
            ])
        );
    };
    return {
        ...scrub(annotations),
        fragments: fragments.map(
            ({ id, sha256: hash, commit, start_line, end_line }) => ({
                id,
                sha256: hash,
                commit,
                start_line,
                end_line,
            })
        ),
    };
}

export async function loadObservedBackendInputs({
    targetRoot,
    privateRoot,
    definitionPath,
}) {
    try {
        const context = await io.context(targetRoot);
        const privateContextValue = await privateContext(
            privateRoot,
            targetRoot,
            context.toolsRoot
        );
        const path = io.inputPath(definitionPath, context.marker);
        const bytes = await io.boundedFile(targetRoot, path, 65536);
        const definition = io.parse(bytes, capsuleLimits);
        const schema = io.parseSchema(
            await io.boundedFile(
                context.toolsRoot,
                'tools/generator-platform/schemas/observation-evidence.schema.json',
                524288
            )
        );
        assertObservationSchema(definition, schema, 'backendSelection');
        unique(definition.operations.map((operation) => operation.id));
        if (!definition.operations.length || definition.operations.length > 8)
            fail('OBS_LIMIT');
        const paths = Object.values(definition.snapshots);
        unique([definitionPath, ...paths]);
        for (const snapshot of paths) io.inputPath(snapshot, context.marker);
        const profile = definition.openapi.profile;
        if (
            !profile ||
            profile.bytes < definition.openapi.bytes ||
            profile.bytes > BACKEND_OBSERVATION_LIMITS.sourceBytes
        )
            fail('OBS_LIMIT');
        const source = await pinned(
            privateRoot,
            definition.openapi,
            profile.bytes,
            BACKEND_OBSERVATION_LIMITS
        );
        const binding = await pinned(privateRoot, definition.binding, 4096);
        validateBinding(binding.value, definition, source.value);
        const observation = await pinned(
            privateRoot,
            definition.observation,
            65536
        );
        const annotations = await pinned(
            privateRoot,
            definition.annotations,
            65536
        );
        assertObservationSchema(observation.value, schema, 'backendWitnesses');
        assertObservationSchema(
            annotations.value,
            schema,
            'backendAnnotations'
        );
        unique(annotations.value.fragments.map((fragment) => fragment.id));
        if (
            !annotations.value.fragments.length ||
            annotations.value.fragments.length > 32 ||
            observation.value.cases.length > 16
        )
            fail('OBS_LIMIT');
        if (annotations.value.models.length > 32) fail('OBS_LIMIT');
        const closure = [
            definition.openapi,
            definition.binding,
            definition.observation,
            definition.annotations,
        ].map((ref) => [ref.path, ref.sha256]);
        let totalBytes =
            source.bytes.length +
            binding.bytes.length +
            observation.bytes.length +
            annotations.bytes.length;
        for (const fragment of annotations.value.fragments) {
            if (
                fragment.end_line < fragment.start_line ||
                fragment.end_line - fragment.start_line + 1 > 120
            )
                fail('OBS_COMPLEMENT');
            const content = await io.boundedFile(
                privateRoot,
                fragment.path,
                Math.min(
                    1048576,
                    BACKEND_OBSERVATION_LIMITS.totalSourceBytes - totalBytes
                )
            );
            totalBytes += content.length;
            if (
                sha256(content) !== fragment.sha256 ||
                content.toString('utf8').split('\n').length < fragment.end_line
            )
                fail('OBS_HASH');
            closure.push([fragment.path, fragment.sha256]);
        }
        unique(observation.value.sources.map((entry) => entry.id));
        if (
            !observation.value.sources.length ||
            observation.value.sources.length > 8
        )
            fail('OBS_LIMIT');
        for (const ref of observation.value.sources) {
            const bytes = await io.boundedFile(
                privateRoot,
                ref.path,
                Math.min(
                    65536,
                    BACKEND_OBSERVATION_LIMITS.totalSourceBytes - totalBytes
                )
            );
            totalBytes += bytes.length;
            if (sha256(bytes) !== ref.sha256) fail('OBS_HASH');
            closure.push([ref.path, ref.sha256]);
        }
        const selected = selectOpenApi(
            source.value,
            definition.operations,
            definition.openapi.base_path
        );
        const claims = safeClaims(
            annotations.value,
            annotations.value.fragments
        );
        const values = {
            openapi: {
                kind: 'selected-openapi',
                source_sha256: definition.openapi.sha256,
                source_bytes: source.bytes.length,
                base_path: definition.openapi.base_path,
                ...selected,
            },
            observations: {
                ...observation.value,
                sources: observation.value.sources.map(
                    ({ id, sha256: hash }) => ({ id, sha256: hash })
                ),
            },
            declarations: claims,
        };
        const snapshots = Object.entries(values).map(([id, value]) => {
            const content = encode(value);
            if (content.length > 65536) fail('OBS_LIMIT');
            if (content.includes(binding.value.origin)) fail('OBS_ASSERTION');
            return {
                id,
                path: definition.snapshots[id],
                content,
                sha256: sha256(content),
            };
        });
        const privateDigest = sha256(
            stableStringify({ root: privateContextValue, closure })
        );
        const after = await io.context(targetRoot);
        if (after.markerHash !== context.markerHash) fail('OBS_ROOT');
        return {
            definition,
            definitionBytes: bytes,
            schema,
            snapshots,
            selected: selected.document,
            claims,
            witnesses: observation.value,
            privateDigest,
            toolsRootHash: sha256(context.toolsRoot),
        };
    } catch (error) {
        fail(observationDiagnostic(error));
    }
}
