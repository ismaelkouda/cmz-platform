import {
    validateWorkflowBehavior,
    validateWorkflowEvidence,
} from './workflow-action-model.mjs';

const expectedPermissions = ['take', 'qualify', 'reject', 'export'];
const expectedSteps = {
    take: [
        'external_call:take',
        'notify:take',
        'refresh:queues',
        'refresh:tasks',
    ],
    qualify: [
        'validate:qualification',
        'external_call:decision',
        'notify:decision',
        'refresh:tasks',
        'refresh:all',
    ],
    export: ['callback:fetch-rows', 'branch:rows', 'await:write-file'],
};
const expectedRules = {
    take: [],
    qualify: [
        'rejected_requires_reason_comment',
        'callback_requires_type',
        'edit_or_callback_requires_comment_and_fields',
    ],
    export: [
        'not_loading',
        'not_exporting',
        'positive_total',
        'no_rows_no_write',
        'errors_notified',
    ],
};

function invariant(condition, message) {
    if (!condition) throw new Error(`workflow-action definition: ${message}`);
}

function sameSet(actual, expected) {
    return (
        actual.length === expected.length &&
        expected.every((value) => actual.includes(value))
    );
}

function sameOrder(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
}

function operation(definition, id) {
    return definition.operations.find((candidate) => candidate.id === id);
}

export function validateWorkflowActionDefinition(definition) {
    invariant(
        sameSet(definition.permissions, expectedPermissions),
        `permissions must be exactly ${expectedPermissions.join(', ')}`
    );
    invariant(
        sameSet(
            definition.operations.map(({ id }) => id),
            ['take', 'qualify', 'export']
        ),
        'operations must be exactly take, qualify, export'
    );
    const take = operation(definition, 'take');
    const qualify = operation(definition, 'qualify');
    const exportOperation = operation(definition, 'export');
    invariant(
        take.kind === 'transition' && take.topology === 'sequential',
        'take must be a sequential transition'
    );
    invariant(
        qualify.kind === 'transition' && qualify.topology === 'sequential',
        'qualify must be a sequential transition'
    );
    invariant(
        exportOperation.kind === 'export' &&
            exportOperation.topology === 'async_callback',
        'export must use async_callback topology'
    );
    for (const candidate of [take, qualify, exportOperation]) {
        invariant(
            sameOrder(candidate.steps, expectedSteps[candidate.id]),
            `${candidate.id}: unsupported step composition`
        );
        invariant(
            sameSet(candidate.rules, expectedRules[candidate.id]),
            `${candidate.id}: unsupported rule set`
        );
    }
    invariant(take.branches.length === 0, 'take cannot declare branches');
    invariant(
        sameSet(
            qualify.branches.map(({ when }) => when),
            ['accepted', 'rejected']
        ),
        'qualify requires accepted and rejected branches'
    );
    invariant(
        sameSet(
            exportOperation.branches.map(({ when }) => when),
            ['rows-found', 'no-rows']
        ),
        'export requires rows-found and no-rows branches'
    );
    return definition;
}

export function compileWorkflowActionDefinition(
    definition,
    { sourceUri, sourceSha256 }
) {
    validateWorkflowActionDefinition(definition);
    const behavior = validateWorkflowBehavior({
        schema_version: '1.0.0',
        domain: {
            id: definition.feature.id,
            description: definition.feature.description,
        },
        state: structuredClone(definition.state),
        permissions: [...definition.permissions],
        operations: structuredClone(definition.operations),
    });
    const sourceId = 'source.workflow-action-definition';
    const evidence = {
        schema_version: '1.0.0',
        sources: [
            {
                id: sourceId,
                path: sourceUri,
                sha256: sourceSha256,
            },
        ],
        claims: behavior.operations.map(({ id }) => ({
            subject: `operation.${id}`,
            source_refs: [sourceId],
        })),
    };
    validateWorkflowEvidence(evidence, behavior);
    return { evidence, behavior };
}
