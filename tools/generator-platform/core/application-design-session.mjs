import {
    actionGraphTypeAtPointer,
    projectActionResultGraph,
} from './action-request-result-graph.mjs';
import { observationInputPrimitives as observationIO } from './runtime-observation-evidence.mjs';
import { validateJsonSchema } from '../validate-ir.mjs';

const own = (value, key) =>
    value !== null && typeof value === 'object' && Object.hasOwn(value, key);
const fail = () => {
    throw new Error('APP_SESSION_BINDING');
};

// Chemin d'opération d'API déclaré par la session (opérations protégées) :
// segments [A-Za-z0-9_.-]+, pour les API versionnées (`/v1.0/…`). Les
// segments `.` et `..`, le segment vide, la barre finale, `%`, `?`, `#`, `\`,
// le protocole et l'hôte restent refusés. Les chemins de page gardent
// canonicalSessionPath, plus strict.
export function canonicalOperationPath(value) {
    return typeof value === 'string' &&
        value.length <= 512 &&
        (value === '/' ||
            /^\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(value)) &&
        !value
            .split('/')
            .some((segment) => segment === '.' || segment === '..') &&
        value.split('/').length <= 33
        ? value
        : null;
}

export function canonicalSessionPath(value) {
    return typeof value === 'string' &&
        value.length <= 512 &&
        (value === '/' ||
            /^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(value)) &&
        value.split('/').length <= 33
        ? value
        : null;
}

function typeAt(graph, modelId, pointer) {
    return actionGraphTypeAtPointer(graph, modelId, pointer);
}

function primitive(field, names) {
    if (field.type.kind !== 'primitive' || !names.includes(field.type.name))
        fail();
    return field;
}

function modelAt(graph, modelId, pointer) {
    const field = typeAt(graph, modelId, pointer);
    if (field.type.kind !== 'model') fail();
    const model = graph.find((entry) => entry.id === field.type.model_id);
    if (model?.kind !== 'object') fail();
    return { field, model };
}

function stringArray(field) {
    if (field.type.kind !== 'array') fail();
    primitive({ type: field.type.items }, ['string']);
}

function producerBinding(producer, pages, contracts, allowed, publicProducer) {
    const page = pages.get(producer.page_id);
    const action = page?.actions.find(
        (entry) => entry.id === producer.action_id
    );
    if (
        !page ||
        !allowed.has(page.id) ||
        action?.kind !== 'backend' ||
        page.access.mode !== (publicProducer ? 'public' : 'authenticated')
    )
        fail();
    const reference = action.operation_ref;
    const contract = contracts.get(reference?.contract_id);
    if (
        contract?.role !== 'target' ||
        contract.contract.contract.status === 'reference'
    )
        fail();
    const operation = contract.contract.operations.find(
        (entry) => entry.id === reference.operation_id
    );
    if (
        !operation ||
        operation.access.mode !==
            (publicProducer ? 'public' : 'authenticated') ||
        operation.access.permissions.length ||
        !['POST', 'PUT', 'PATCH', 'DELETE'].includes(operation.method)
    )
        fail();
    const response = operation.responses.find(
        (entry) =>
            entry.status === producer.response_status &&
            entry.outcome === 'success'
    );
    if (
        !response?.body ||
        response.body.model_id !== producer.result_model_id ||
        response.body.media_type !== 'application/json'
    )
        fail();
    const graph = projectActionResultGraph(contract.contract.models, [
        producer.result_model_id,
    ]);
    if (
        graph.find((entry) => entry.id === producer.result_model_id)?.kind !==
        'object'
    )
        fail();
    return { page, action, contract, operation, graph };
}

function menuBinding(graph, rootId, session) {
    const field = typeAt(graph, rootId, session.projection.menu_pointer);
    if (field.type.kind !== 'array' || field.type.items.kind !== 'model')
        fail();
    const models = new Map(graph.map((model) => [model.id, model]));
    const seen = new Set();
    let id = field.type.items.model_id;
    while (id) {
        if (
            seen.has(id) ||
            seen.size >= 32 ||
            models.get(id)?.kind !== 'object'
        )
            fail();
        seen.add(id);
        primitive(typeAt(graph, id, session.menu.label_pointer), ['string']);
        primitive(typeAt(graph, id, session.menu.path_pointer), ['string']);
        const children = session.menu.children_pointer;
        if (children === undefined) break;
        // Leaves may omit the declared children field entirely. An existing
        // field still has to be a typed array, never arbitrary JSON.
        let next;
        try {
            next = typeAt(graph, id, children);
        } catch {
            if (seen.size === 1) fail();
            break;
        }
        if (next.type.kind !== 'array' || next.type.items.kind !== 'model')
            fail();
        id = next.type.items.model_id;
    }
}

export function resolveApplicationSession(design, experience, contracts) {
    const session = experience.session;
    if (
        !session ||
        design.schema_version !== '1.1.0' ||
        experience.channel !== 'web' ||
        experience.offline_policy !== 'none' ||
        session.storage !== 'memory' ||
        design.pages.length > 64
    )
        fail();
    const pages = new Map(design.pages.map((page) => [page.id, page]));
    const allowed = new Set(experience.page_ids);
    if (allowed.size !== experience.page_ids.length || allowed.size > 64)
        fail();
    for (const id of allowed)
        if (!canonicalSessionPath(pages.get(id)?.path)) fail();
    const connection = producerBinding(
        session.producer,
        pages,
        contracts,
        allowed,
        true
    );
    const root = session.producer.result_model_id;
    const projection = session.projection;
    primitive(typeAt(connection.graph, root, projection.token_pointer), [
        'string',
    ]);
    const subject = modelAt(connection.graph, root, projection.subject_pointer);
    stringArray(
        typeAt(connection.graph, root, projection.allowed_paths_pointer)
    );
    if (projection.permissions_pointer !== undefined)
        stringArray(
            typeAt(connection.graph, root, projection.permissions_pointer)
        );
    menuBinding(connection.graph, root, session);
    if (
        experience.entry_page_id !== session.producer.page_id ||
        session.reconnect_page_id !== session.producer.page_id
    )
        fail();
    const stageIds = new Set();
    const stagePages = new Set();
    const completionOperations = new Set();
    const stages = session.stages.map((stage) => {
        if (
            stageIds.has(stage.id) ||
            stagePages.has(stage.page_id) ||
            stage.page_id === session.producer.page_id ||
            stage.page_id === session.landing_page_id ||
            stage.completion.producer.page_id !== stage.page_id
        )
            fail();
        stageIds.add(stage.id);
        stagePages.add(stage.page_id);
        // A challenge may omit the subject. Establishment requires it at
        // runtime; stage fields must be required inside that decoded subject.
        const prefix = projection.subject_pointer + '/';
        const field = stage.predicate.pointer.startsWith(prefix)
            ? typeAt(
                  connection.graph,
                  subject.model.id,
                  stage.predicate.pointer.slice(
                      projection.subject_pointer.length
                  )
              )
            : typeAt(connection.graph, root, stage.predicate.pointer);
        if (!field.required) fail();
        if (stage.predicate.operator === 'is-null') {
            if (!field.nullable && field.type.name !== 'null') fail();
        } else if (stage.predicate.operator === 'is-true')
            primitive(field, ['boolean']);
        else fail();
        const completion = producerBinding(
            stage.completion.producer,
            pages,
            contracts,
            allowed,
            false
        );
        const key = completion.contract.id + ':' + completion.operation.id;
        if (completionOperations.has(key)) fail();
        completionOperations.add(key);
        if (stage.completion.result_condition) {
            const result = typeAt(
                completion.graph,
                stage.completion.producer.result_model_id,
                stage.completion.result_condition.pointer
            );
            primitive(result, ['boolean']);
            if (!result.required || result.nullable) fail();
        }
        return structuredClone(stage);
    });
    const landing = pages.get(session.landing_page_id);
    if (!allowed.has(landing?.id) || landing.access.mode !== 'authenticated')
        fail();
    for (const pageId of allowed) {
        const page = pages.get(pageId);
        if (
            page.access.mode === 'authorized' &&
            projection.permissions_pointer === undefined
        )
            fail();
        if (pageId !== connection.page.id && page.access.mode === 'public')
            fail();
    }
    const covered = new Set();
    for (const binding of session.protected_operations) {
        const entry = contracts.get(binding.contract_id);
        const operation = entry?.contract.operations.find(
            (value) => value.id === binding.operation_id
        );
        const key = binding.contract_id + ':' + binding.operation_id;
        if (
            entry?.role !== 'target' ||
            !operation ||
            operation.access.mode === 'public' ||
            covered.has(key) ||
            binding.service_id !== operation.service_id ||
            binding.method !== operation.method ||
            binding.path !== operation.path ||
            !canonicalOperationPath(binding.path) ||
            operation.access.security_scheme_ids.length !== 1 ||
            binding.security_scheme_id !==
                operation.access.security_scheme_ids[0] ||
            entry.contract.security_schemes.find(
                (scheme) => scheme.id === binding.security_scheme_id
            )?.kind !== 'bearer'
        )
            fail();
        covered.add(key);
    }
    for (const pageId of allowed) {
        const page = pages.get(pageId);
        for (const trigger of [
            ...page.loads,
            ...page.actions.filter((action) => action.kind === 'backend'),
        ]) {
            const reference = trigger.operation_ref;
            const entry = contracts.get(reference.contract_id);
            const operation = entry?.contract.operations.find(
                (value) => value.id === reference.operation_id
            );
            if (
                operation?.access.mode !== 'public' &&
                !covered.has(
                    reference.contract_id + ':' + reference.operation_id
                )
            )
                fail();
        }
    }
    return {
        ...sessionRenderConfiguration(design, experience),
        stages,
        experience_id: experience.id,
        producer_operation: {
            contract_id: connection.contract.id,
            operation_id: connection.operation.id,
        },
    };
}

// Renderers consume this explicit transport declaration after native design
// validation. No hidden cache or implicit transfer of dependency state.
export function sessionRenderConfiguration(design, experience) {
    const pages = new Map(design.pages.map((page) => [page.id, page]));
    return {
        ...structuredClone(experience.session),
        routes: experience.page_ids.map((id) => {
            const page = pages.get(id);
            if (!page || !canonicalSessionPath(page.path)) fail();
            return {
                page_id: id,
                path: page.path,
                access: structuredClone(page.access),
            };
        }),
    };
}

export function validateApplicationSessions(design, schema, contracts) {
    const sessions = (design.experiences ?? []).filter((experience) =>
        own(experience, 'session')
    );
    if (design.schema_version !== '1.1.0')
        return sessions.length ? ['APP_SESSION_VERSION'] : [];
    try {
        // Reuse the own-only native schema parser: inherited properties must
        // never become an alternative to a closed session declaration.
        const bytes = Buffer.from(JSON.stringify(schema));
        if (
            bytes.length > 524288 ||
            validateJsonSchema(design, observationIO.parseSchema(bytes)).length
        )
            return ['APP_SESSION_SCHEMA'];
        if (sessions.length > 1) return ['APP_SESSION_UNSUPPORTED'];
        for (const experience of sessions)
            resolveApplicationSession(design, experience, contracts);
        return [];
    } catch {
        return ['APP_SESSION_BINDING'];
    }
}

// Legacy navigation reachability remains byte-for-byte equivalent in intent.
// A session explicitly contributes its ordered stage and landing edges.
export function validateExperienceGraph(experience, pages, errors) {
    const allowed = new Set(experience.page_ids ?? []);
    const visited = new Set([experience.entry_page_id]);
    const queue = [experience.entry_page_id];
    while (queue.length > 0) {
        const page = pages.get(queue.shift());
        const destinations = (page?.actions ?? [])
            .filter((action) => action.kind === 'navigate')
            .map((action) => action.destination_page_id);
        if (
            experience.session &&
            page?.id === experience.session.producer.page_id
        )
            destinations.push(
                ...experience.session.stages.map((stage) => stage.page_id),
                experience.session.landing_page_id
            );
        for (const destination of destinations) {
            if (allowed.has(destination) && !visited.has(destination)) {
                visited.add(destination);
                queue.push(destination);
            }
        }
    }
    for (const pageId of allowed) {
        if (!visited.has(pageId))
            errors.push(
                `$.experiences[${experience.id}]: unreachable page ${pageId}`
            );
        const page = pages.get(pageId);
        if (
            experience.offline_policy !== 'none' &&
            (page?.loads?.length > 0 ||
                page?.actions?.some((action) => action.kind === 'backend')) &&
            !page.states.some((state) => state.kind === 'offline')
        )
            errors.push(
                `$.experiences[${experience.id}]: page ${pageId} needs an offline state`
            );
    }
}
