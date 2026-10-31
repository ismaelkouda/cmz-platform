import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { isDeepStrictEqual, TextDecoder } from 'node:util';

import { repositoryRoot, validateJsonSchema } from '../validate-ir.mjs';
import {
    assertPhysicalPath,
    isWithin,
    safeRelativePath,
} from './external-application-paths.mjs';
import { sha256, stableStringify } from './generation-manifest.mjs';
import { parseStructuredSource } from './source-document.mjs';

export const OBSERVATION_LIMITS = Object.freeze({
    documentBytes: 65536,
    markerBytes: 524288,
    ownedFileBytes: 1048576,
    ownedTotalBytes: 8388608,
    depth: 24,
    nodes: 4096,
    stringLength: 1024,
    sources: 8,
    facts: 64,
    operations: 8,
    cases: 16,
    shapeDepth: 8,
    shapeWidth: 32,
});

const MARKER = '.cmz/application-workspace.json';
const SCHEMAS = 'tools/generator-platform/schemas/';
const RESERVED = new Set([
    'apps',
    'node_modules',
    '.cmz',
    '.git',
    '.nx',
    '.angular',
    'dist',
    'coverage',
    'tmp',
]);
const UNKNOWN = [
    'network-authenticity',
    'permissions',
    'required-fields',
    'exhaustiveness',
    'validity-window',
];
const CODES = new Set([
    'OBS_ARGUMENTS',
    'OBS_ROOT',
    'OBS_FILE',
    'OBS_LIMIT',
    'OBS_PARSE',
    'OBS_SCHEMA',
    'OBS_IDENTITY',
    'OBS_HASH',
    'OBS_POINTER',
    'OBS_BINDING',
    'OBS_ASSERTION',
    'OBS_INTERNAL',
]);

class ObservationError extends Error {
    constructor(code) {
        super(CODES.has(code) ? code : 'OBS_INTERNAL');
        this.name = 'ObservationError';
        this.code = this.message;
        // Even callers serializing the error must not receive native details.
        this.stack = this.message;
    }
}

function fail(code) {
    throw new ObservationError(code);
}

export function observationDiagnostic(error) {
    return error instanceof ObservationError && CODES.has(error.code)
        ? error.code
        : 'OBS_INTERNAL';
}

async function identityChain(path) {
    await assertPhysicalPath(path);
    const identities = [];
    for (let current = resolve(path); ; current = dirname(current)) {
        const stat = await lstat(current, { bigint: true });
        identities.push([current, stat.dev.toString(), stat.ino.toString()]);
        if (current === sep) return identities;
    }
}

// readProductFile uses handle.readFile() without a cap. This local reader
// composes its physical-path guards with a capped descriptor read instead;
// it never calls the unbounded reader on a product-controlled file.
async function boundedFile(root, path, limit) {
    let handle;
    try {
        if (typeof path !== 'string' || path.length > 256) fail('OBS_FILE');
        const absolute = resolve(root, safeRelativePath(path));
        if (!isWithin(root, absolute) || absolute === root) fail('OBS_FILE');
        const chain = await identityChain(absolute);
        const before = await lstat(absolute);
        if (!before.isFile()) fail('OBS_FILE');
        if (before.size > limit) fail('OBS_LIMIT');
        handle = await open(
            absolute,
            constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
        );
        const opened = await handle.stat();
        if (
            !opened.isFile() ||
            opened.dev !== before.dev ||
            opened.ino !== before.ino
        )
            fail('OBS_FILE');
        if (opened.size > limit) fail('OBS_LIMIT');
        const buffer = Buffer.alloc(limit + 1);
        let length = 0;
        while (length < buffer.length) {
            const { bytesRead } = await handle.read(
                buffer,
                length,
                buffer.length - length,
                length
            );
            if (!bytesRead) break;
            length += bytesRead;
        }
        if (length > limit) fail('OBS_LIMIT');
        const after = await handle.stat();
        if (
            length !== opened.size ||
            after.size !== opened.size ||
            after.mtimeMs !== opened.mtimeMs ||
            after.ctimeMs !== opened.ctimeMs ||
            !isDeepStrictEqual(chain, await identityChain(absolute))
        )
            fail('OBS_FILE');
        return buffer.subarray(0, length);
    } catch (error) {
        if (error instanceof ObservationError) throw error;
        fail('OBS_FILE');
    } finally {
        if (handle) await handle.close().catch(() => fail('OBS_FILE'));
    }
}

// A resource preflight, NOT a second JSON/YAML parser: accept only JSON flow
// characters outside double-quoted strings, and bound nesting/tokens BEFORE
// calling the existing parser. Grammar and duplicate keys remain its job.
function preflight(text) {
    let quoted = false;
    let escaped = false;
    let depth = 0;
    let tokens = 0;
    let length = 0;
    for (const char of text) {
        if (quoted) {
            if (!escaped && char === '"') {
                quoted = false;
                continue;
            }
            if (++length > OBSERVATION_LIMITS.stringLength) fail('OBS_LIMIT');
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
        } else if (char === '"') {
            quoted = true;
            length = 0;
            tokens += 1;
        } else if (char === '{' || char === '[') {
            depth += 1;
            tokens += 1;
            if (depth > OBSERVATION_LIMITS.depth) fail('OBS_LIMIT');
        } else if (char === '}' || char === ']') {
            depth -= 1;
            if (depth < 0) fail('OBS_PARSE');
        } else if (char === ',' || char === ':') tokens += 1;
        else if (!/[ \t\r\n0-9.eE+\-truefalsn]/.test(char)) fail('OBS_PARSE');
        if (tokens > OBSERVATION_LIMITS.nodes) fail('OBS_LIMIT');
    }
    if (quoted || depth !== 0 || !text.trimStart().startsWith('{'))
        fail('OBS_PARSE');
}

function boundValue(value) {
    const pending = [[value, 0]];
    let count = 0;
    while (pending.length) {
        const [current, depth] = pending.pop();
        if (
            ++count > OBSERVATION_LIMITS.nodes ||
            depth > OBSERVATION_LIMITS.depth
        )
            fail('OBS_LIMIT');
        if (
            typeof current === 'string' &&
            current.length > OBSERVATION_LIMITS.stringLength
        )
            fail('OBS_LIMIT');
        if (typeof current === 'number' && !Number.isFinite(current))
            fail('OBS_SCHEMA');
        if (!current || typeof current !== 'object') continue;
        const children = Object.values(current);
        if (children.length > 256) fail('OBS_LIMIT');
        for (const child of children) {
            pending.push([child, depth + 1]);
        }
    }
}

function parse(bytes) {
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        preflight(text);
        const value = parseStructuredSource(text, 'observation');
        boundValue(value);
        return value;
    } catch (error) {
        if (error instanceof ObservationError) throw error;
        // prettyErrors can contain source text: never propagate its Error.
        fail('OBS_PARSE');
    }
}

function parseSchema(bytes) {
    const schema = parse(bytes);
    // parse() has already bounded this tree. The native validator performs
    // properties?.[key]: make every schema property table own-only, including
    // tables under $defs, items and combinators. This changes lookup, not the
    // schema contract, and does not filter legitimate field-name values.
    const pending = [schema];
    while (pending.length) {
        const current = pending.pop();
        if (!current || typeof current !== 'object') continue;
        if (Object.hasOwn(current, 'properties')) {
            const properties = current.properties;
            if (
                !properties ||
                typeof properties !== 'object' ||
                Array.isArray(properties)
            )
                fail('OBS_SCHEMA');
            Object.setPrototypeOf(properties, null);
        }
        pending.push(...Object.values(current));
    }
    return schema;
}

function schemaCheck(value, schema, definition) {
    try {
        if (validateJsonSchema(value, schema.$defs[definition], schema).length)
            fail('OBS_SCHEMA');
    } catch {
        fail('OBS_SCHEMA');
    }
}

function unique(entries, key, limit) {
    if (entries.length > limit) fail('OBS_LIMIT');
    if (new Set(entries.map((entry) => entry[key])).size !== entries.length)
        fail('OBS_IDENTITY');
}

async function context(targetRoot) {
    try {
        if (
            typeof targetRoot !== 'string' ||
            targetRoot.length > 1024 ||
            !isAbsolute(targetRoot) ||
            resolve(targetRoot) !== targetRoot ||
            targetRoot === sep
        )
            fail('OBS_ROOT');
        const toolsRoot = await realpath(repositoryRoot);
        await assertPhysicalPath(targetRoot);
        if (
            !(await lstat(targetRoot)).isDirectory() ||
            isWithin(toolsRoot, targetRoot) ||
            isWithin(targetRoot, toolsRoot)
        )
            fail('OBS_ROOT');
        // A product may have its own Git root, but may not be inside another
        // repository. No Git command, lock, discovery or mutation is needed.
        for (let parent = dirname(targetRoot); ; parent = dirname(parent)) {
            try {
                await lstat(resolve(parent, '.git'));
                fail('OBS_ROOT');
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
            if (parent === sep) break;
        }
        const bytes = await boundedFile(
            targetRoot,
            MARKER,
            OBSERVATION_LIMITS.markerBytes
        );
        const marker = parse(bytes);
        const schema = parseSchema(
            await boundedFile(
                toolsRoot,
                SCHEMAS + 'application-workspace-manifest.schema.json',
                OBSERVATION_LIMITS.markerBytes
            )
        );
        if (validateJsonSchema(marker, schema).length) fail('OBS_ROOT');
        const { workspace_id: id, ...identity } = marker;
        if (sha256(stableStringify(identity)) !== id) fail('OBS_ROOT');
        unique(marker.files, 'path', 128);
        let total = 0;
        for (const file of marker.files) {
            if (file.path === MARKER) fail('OBS_ROOT');
            total += file.bytes;
            if (total > OBSERVATION_LIMITS.ownedTotalBytes) fail('OBS_LIMIT');
            const content = await boundedFile(
                targetRoot,
                file.path,
                OBSERVATION_LIMITS.ownedFileBytes
            );
            if (
                content.length !== file.bytes ||
                sha256(content) !== file.sha256
            )
                fail('OBS_ROOT');
        }
        for (const directory of marker.directories) {
            const absolute = await assertPhysicalPath(
                resolve(targetRoot, directory)
            );
            if (!(await lstat(absolute)).isDirectory()) fail('OBS_ROOT');
        }
        return { toolsRoot, marker, markerHash: sha256(bytes) };
    } catch (error) {
        if (error instanceof ObservationError) throw error;
        fail('OBS_ROOT');
    }
}

function inputPath(path, marker) {
    try {
        if (typeof path !== 'string' || path.length > 256) fail('OBS_FILE');
        safeRelativePath(path);
        if (
            RESERVED.has(path.split('/')[0]) ||
            path === 'bun.lock' ||
            marker.files.some((file) => file.path === path)
        )
            fail('OBS_FILE');
        return path;
    } catch {
        fail('OBS_FILE');
    }
}

function pointerTokens(pointer) {
    if (
        typeof pointer !== 'string' ||
        pointer.length > 512 ||
        (pointer !== '' && !pointer.startsWith('/')) ||
        /~(?![01])/.test(pointer)
    )
        fail('OBS_POINTER');
    return pointer === ''
        ? []
        : pointer
              .slice(1)
              .split('/')
              .map((token) =>
                  token.replaceAll('~1', '/').replaceAll('~0', '~')
              );
}

export function resolveObservationPointer(document, pointer) {
    let current = document;
    for (const token of pointerTokens(pointer)) {
        if (
            current === null ||
            typeof current !== 'object' ||
            !Object.hasOwn(current, token) ||
            (Array.isArray(current) && !/^(?:0|[1-9][0-9]*)$/.test(token))
        )
            fail('OBS_POINTER');
        current = current[token];
    }
    return current;
}

function shapeCheck(shape, depth = 0) {
    if (depth > OBSERVATION_LIMITS.shapeDepth) fail('OBS_LIMIT');
    if (shape.kind === 'object') {
        unique(shape.fields, 'name', OBSERVATION_LIMITS.shapeWidth);
        for (const field of shape.fields) shapeCheck(field.shape, depth + 1);
    } else if (shape.kind === 'array') {
        if (shape.items.length > OBSERVATION_LIMITS.shapeWidth)
            fail('OBS_LIMIT');
        if (shape.length !== shape.items.length) fail('OBS_SCHEMA');
        for (const item of shape.items) {
            if (item.kind === 'absent') fail('OBS_SCHEMA');
            shapeCheck(item, depth + 1);
        }
    }
}

function projectionCheck(projection) {
    unique(projection.operations, 'id', OBSERVATION_LIMITS.operations);
    const date = new Date(projection.captured_at);
    if (
        !Number.isFinite(date.getTime()) ||
        date.toISOString() !== projection.captured_at
    )
        fail('OBS_SCHEMA');
    for (const operation of projection.operations) {
        unique(operation.cases, 'id', OBSERVATION_LIMITS.cases);
        for (const entry of operation.cases) shapeCheck(entry.shape);
    }
}

function unknowns(shape) {
    const result = new Set(UNKNOWN);
    function visit(node) {
        if (node.kind === 'null') result.add('non-null-type');
        if (node.kind === 'absent') result.add('presence-guarantee');
        if (node.kind === 'array') {
            if (node.length === 0) result.add('item-type');
            node.items.forEach(visit);
        }
        if (node.kind === 'object')
            node.fields.forEach((field) => visit(field.shape));
    }
    visit(shape);
    return [...result].sort();
}

function factInventory(fact, projection) {
    const node = resolveObservationPointer(projection, fact.pointer);
    const tokens = pointerTokens(fact.pointer);
    // Bind to the carrier operation/case, not merely to an equal shape found
    // elsewhere. Subsequent tokens must walk structural nodes exclusively.
    if (
        tokens[0] !== 'operations' ||
        tokens[2] !== 'cases' ||
        tokens[4] !== 'shape' ||
        tokens.length < 5
    )
        fail('OBS_BINDING');
    const operation = projection.operations[tokens[1]];
    const entry = operation?.cases[tokens[3]];
    if (operation?.id !== fact.operation_id || entry?.id !== fact.case_id)
        fail('OBS_BINDING');
    for (let index = 5; index < tokens.length;) {
        if (tokens[index] === 'fields' && tokens[index + 2] === 'shape')
            index += 3;
        else if (tokens[index] === 'items') index += 2;
        else fail('OBS_BINDING');
        if (index > tokens.length) fail('OBS_BINDING');
    }
    if (!isDeepStrictEqual(node, fact.expected)) fail('OBS_ASSERTION');
    return {
        id: fact.id,
        source_id: fact.source_id,
        operation_id: fact.operation_id,
        case_id: fact.case_id,
        pointer: fact.pointer,
        method: operation.method,
        path: operation.path,
        status: entry.status,
        content_type: entry.content_type,
        observation: node,
        unknowns: unknowns(node),
    };
}

export async function inspectRuntimeObservations(options) {
    try {
        if (
            !options ||
            typeof options !== 'object' ||
            Array.isArray(options) ||
            Object.keys(options).some(
                (key) => !['targetRoot', 'selectionPath'].includes(key)
            )
        )
            fail('OBS_ARGUMENTS');
        const { targetRoot, selectionPath } = options;
        const { toolsRoot, marker, markerHash } = await context(targetRoot);
        const schema = parseSchema(
            await boundedFile(
                toolsRoot,
                SCHEMAS + 'observation-evidence.schema.json',
                OBSERVATION_LIMITS.markerBytes
            )
        );
        const selectionBytes = await boundedFile(
            targetRoot,
            inputPath(selectionPath, marker),
            OBSERVATION_LIMITS.documentBytes
        );
        const selection = parse(selectionBytes);
        schemaCheck(selection, schema, 'selection');
        unique(selection.sources, 'id', OBSERVATION_LIMITS.sources);
        unique(selection.sources, 'path', OBSERVATION_LIMITS.sources);
        unique(selection.facts, 'id', OBSERVATION_LIMITS.facts);
        const documents = new Map();
        const sources = [];
        for (const source of selection.sources) {
            if (source.path === selectionPath) fail('OBS_FILE');
            const bytes = await boundedFile(
                targetRoot,
                inputPath(source.path, marker),
                OBSERVATION_LIMITS.documentBytes
            );
            if (sha256(bytes) !== source.sha256) fail('OBS_HASH');
            const projection = parse(bytes);
            schemaCheck(projection, schema, 'projection');
            projectionCheck(projection);
            if (projection.source_id !== source.id) fail('OBS_IDENTITY');
            documents.set(source.id, projection);
            sources.push({
                ...source,
                bytes: bytes.length,
                origin: projection.origin,
                context_alias: projection.context_alias,
                captured_at: projection.captured_at,
            });
        }
        const facts = selection.facts.map((fact) => {
            const projection = documents.get(fact.source_id);
            if (!projection) fail('OBS_IDENTITY');
            return factInventory(fact, projection);
        });
        const inventory = {
            schema_version: '1.0.0',
            kind: 'observation-inventory',
            qualification: 'structural-only',
            network_verified: false,
            workspace_id: marker.workspace_id,
            selection_sha256: sha256(selectionBytes),
            sources,
            facts,
        };
        schemaCheck(inventory, schema, 'inventory');
        if (
            sha256(
                await boundedFile(
                    targetRoot,
                    MARKER,
                    OBSERVATION_LIMITS.markerBytes
                )
            ) !== markerHash
        )
            fail('OBS_ROOT');
        return inventory;
    } catch (error) {
        if (error instanceof ObservationError) throw error;
        fail('OBS_INTERNAL');
    }
}
