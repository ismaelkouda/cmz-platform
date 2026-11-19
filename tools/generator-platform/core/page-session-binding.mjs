import { createHash } from 'node:crypto';
import {
    closeSync,
    constants,
    fstatSync,
    lstatSync,
    openSync,
    readSync,
} from 'node:fs';
import { observationInputPrimitives as io } from './runtime-observation-evidence.mjs';

const fail = (message = 'PAGE_SESSION_BINDING') => {
    throw new Error(`page execution planner: ${message}`);
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const own = (value, key) =>
    value !== null && typeof value === 'object' && Object.hasOwn(value, key);

function hasConsistentCommandBindings(withoutBody, bindings) {
    return Array.isArray(bindings) && (bindings.length === 0) === withoutBody;
}

// Compose the caller's existing physical workspace-path guard with a bounded
// descriptor read. The synchronous realization API keeps its native contract.
export function readBoundedPageFile(path) {
    let handle;
    try {
        const before = lstatSync(path);
        if (!before.isFile() || before.isSymbolicLink())
            fail('PAGE_ARTIFACT_FILE');
        if (before.size > 1048576) fail('PAGE_ARTIFACT_LIMIT');
        handle = openSync(
            path,
            constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
        );
        const opened = fstatSync(handle);
        if (
            !opened.isFile() ||
            opened.dev !== before.dev ||
            opened.ino !== before.ino ||
            opened.size > 1048576
        )
            fail('PAGE_ARTIFACT_FILE');
        const bytes = Buffer.alloc(1048577);
        let length = 0;
        while (length < bytes.length) {
            const count = readSync(
                handle,
                bytes,
                length,
                Math.min(65536, bytes.length - length),
                length
            );
            if (!count) break;
            length += count;
        }
        const after = fstatSync(handle),
            named = lstatSync(path);
        if (length > 1048576) fail('PAGE_ARTIFACT_LIMIT');
        if (
            length !== opened.size ||
            after.size !== opened.size ||
            after.mtimeMs !== opened.mtimeMs ||
            after.ctimeMs !== opened.ctimeMs ||
            named.dev !== opened.dev ||
            named.ino !== opened.ino ||
            named.isSymbolicLink()
        )
            fail('PAGE_ARTIFACT_FILE');
        return bytes.subarray(0, length);
    } catch (error) {
        fail(
            error?.message?.endsWith('PAGE_ARTIFACT_LIMIT')
                ? 'PAGE_ARTIFACT_LIMIT'
                : 'PAGE_ARTIFACT_FILE'
        );
    } finally {
        if (handle !== undefined) closeSync(handle);
    }
}

export function parsePageDocument(content) {
    if (!Buffer.isBuffer(content) || content.length > 1048576)
        fail('PAGE_ARTIFACT_LIMIT');
    try {
        return io.parse(content);
    } catch {
        fail('PAGE_ARTIFACT_JSON');
    }
}

export function parsePageSchema(schema) {
    try {
        const bytes = Buffer.from(JSON.stringify(schema));
        if (bytes.length > 524288) fail('PAGE_ARTIFACT_LIMIT');
        return io.parseSchema(bytes);
    } catch {
        fail('PAGE_ARTIFACT_SCHEMA');
    }
}

export function isNormalizedRelativeUri(value) {
    return (
        typeof value === 'string' &&
        /^[A-Za-z0-9._/-]+$/.test(value) &&
        !value.startsWith('/') &&
        value.split('/').every((part) => part && !['.', '..'].includes(part))
    );
}

export function parsePageArtifact(artifact, label, validate) {
    if (!artifact || typeof artifact !== 'object') fail(`${label} is required`);
    if (!isNormalizedRelativeUri(artifact.uri))
        fail(`${label} uri must be a normalized relative path`);
    if (!/^[a-f0-9]{64}$/.test(artifact.sha256 ?? ''))
        fail(`${label} sha256 is invalid`);
    const document = Buffer.isBuffer(artifact.document)
        ? artifact.document
        : typeof artifact.document === 'string'
          ? Buffer.from(artifact.document)
          : null;
    if (!document || document.length > 1048576) fail('PAGE_ARTIFACT_LIMIT');
    if (sha(document) !== artifact.sha256)
        fail(`${label} sha256 does not match its document`);
    let value;
    try {
        value = io.parse(document);
    } catch {
        fail(`${label} is not valid JSON (PAGE_ARTIFACT_JSON)`);
    }
    const errors = validate(value);
    if (errors.length) fail(`${label} is invalid\n${errors.join('\n')}`);
    return { uri: artifact.uri, sha256: artifact.sha256, value };
}

export function sessionCapabilityRequirements(plan) {
    return plan.schema_version === '1.1.0'
        ? ['session.memory@1', 'session.decoded-producer@1', 'session.epoch@1']
        : [];
}

function projectedPointer(operation, pointer) {
    if (pointer === '') return;
    if (
        typeof pointer !== 'string' ||
        pointer.length > 256 ||
        !pointer.startsWith('/') ||
        /~(?:[^01]|$)/.test(pointer)
    )
        fail();
    const field = pointer
        .slice(1)
        .split('/')[0]
        .replaceAll('~1', '/')
        .replaceAll('~0', '~');
    if (
        !operation.result_model.fields.some(
            (entry) => entry.source_field === field
        )
    )
        fail();
}

export function compilePageSessionBinding(pageContract, commandPairs) {
    const session = pageContract.experience?.session;
    if (session === undefined) return undefined;
    if (
        !session ||
        session.storage !== 'memory' ||
        !Array.isArray(session.stages) ||
        session.stages.length > 4 ||
        !Array.isArray(session.routes) ||
        session.routes.length > 64
    )
        fail();
    if (
        commandPairs.some(
            ({ resolved }) => resolved.model.schema_version !== '1.1.0'
        )
    )
        fail();
    if (
        commandPairs.some(
            ({ source, resolved }) =>
                !hasConsistentCommandBindings(
                    resolved.operation.port.input.kind === 'none',
                    source.input_bindings
                )
        )
    )
        fail('PAGE_SESSION_INPUT_BINDINGS');
    const effects = [];
    const pageId = pageContract.page.id;
    const bindings = [
        { producer: session.producer, kind: 'establish', stage_id: null },
        ...session.stages.map((stage) => ({
            producer: stage.completion.producer,
            kind: stage.completion.effect,
            stage_id: stage.id,
            ...(stage.completion.result_condition
                ? { result_condition: stage.completion.result_condition }
                : {}),
        })),
    ];
    for (const effect of bindings) {
        if (effect.producer.page_id !== pageId) continue;
        const matches = commandPairs.filter(
            ({ source }) => source.id === effect.producer.action_id
        );
        if (matches.length !== 1) fail();
        const { source, resolved } = matches[0];
        const action = resolved.operation;
        if (
            resolved.model.schema_version !== '1.1.0' ||
            action.transport.success_response_status !==
                effect.producer.response_status ||
            action.transport.response_model_id !==
                effect.producer.result_model_id
        )
            fail();
        if (effect.kind === 'establish') {
            for (const pointer of Object.values(session.projection))
                projectedPointer(action, pointer);
            for (const stage of session.stages)
                projectedPointer(action, stage.predicate.pointer);
        }
        if (effect.result_condition)
            projectedPointer(action, effect.result_condition.pointer);
        effects.push({
            node_id: source.id,
            kind: effect.kind,
            stage_id: effect.stage_id,
            producer: structuredClone(effect.producer),
            canonical_fields: action.result_model.fields.map((field) => ({
                name: field.name,
                source_field: field.source_field,
            })),
        });
    }
    return {
        configuration_sha256: sha(JSON.stringify(session)),
        effects: effects.sort((a, b) => a.node_id.localeCompare(b.node_id)),
    };
}

export function validatePageSessionBinding(plan) {
    try {
        if (plan.schema_version === '1.0.0')
            return own(plan, 'session') ? ['PAGE_SESSION_VERSION'] : [];
        if (
            plan.schema_version !== '1.1.0' ||
            !plan.session ||
            !/^[a-f0-9]{64}$/.test(plan.session.configuration_sha256) ||
            !Array.isArray(plan.session.effects) ||
            plan.session.effects.length > 5 ||
            plan.query_nodes.length + plan.command_nodes.length === 0
        )
            fail();
        if (
            plan.command_nodes.some(
                (node) =>
                    node.primitive_ref.schema_version !== '1.1.0' ||
                    !hasConsistentCommandBindings(
                        node.capabilities.includes('action.body.none@1'),
                        node.input_bindings
                    )
            )
        )
            fail();
        const used = new Set();
        for (const effect of plan.session.effects) {
            const node = plan.command_nodes.find(
                (entry) => entry.id === effect.node_id
            );
            if (
                !node ||
                node.primitive_ref.schema_version !== '1.1.0' ||
                used.has(node.id) ||
                !['establish', 'acknowledge', 'clear-and-reconnect'].includes(
                    effect.kind
                ) ||
                effect.producer.page_id !== plan.page.id ||
                !Array.isArray(effect.canonical_fields) ||
                effect.canonical_fields.length > 32 ||
                (effect.kind === 'establish'
                    ? effect.stage_id !== null
                    : typeof effect.stage_id !== 'string')
            )
                fail();
            used.add(node.id);
            const names = new Set(),
                sourceFields = new Set();
            for (const field of effect.canonical_fields) {
                if (
                    !field.name ||
                    !field.source_field ||
                    names.has(field.name) ||
                    sourceFields.has(field.source_field)
                )
                    fail();
                names.add(field.name);
                sourceFields.add(field.source_field);
            }
        }
        return [];
    } catch {
        return ['PAGE_SESSION_BINDING'];
    }
}

export function duplicateValues(values) {
    const seen = new Set();
    return values.filter((value) => {
        if (seen.has(value)) return true;
        seen.add(value);
        return false;
    });
}

export function validatePageExecutionCapabilities(plan, availableCapabilities) {
    const duplicates = duplicateValues(availableCapabilities ?? []);
    const available = new Set(availableCapabilities ?? []);
    return [
        ...duplicates.map(
            (value) => `available capabilities: duplicate ${value}`
        ),
        ...(plan?.required_capabilities ?? [])
            .filter((requirement) => !available.has(requirement))
            .map((requirement) => `missing target capability ${requirement}`),
    ];
}
