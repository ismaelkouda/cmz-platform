import {
    validateWorkflowBehavior,
    validateWorkflowEvidence,
} from './workflow-action-model.mjs';

/**
 * Généralisation (PLAT-4bis, 2026-08-18) : le contrat `workflow-action`
 * reste borné à exactement 3 RÔLES structurels — une transition d'entrée
 * sans branche, une transition de décision à 2 branches accept/reject, un
 * export async à 2 branches rows-found/no-rows — mais le VOCABULAIRE
 * (`permissions`, `operations[].id`) n'est plus figé sur
 * `take`/`qualify`/`reject`/`export`. Les rôles sont détectés
 * structurellement (kind/topology/branches), pas par nom littéral. Les
 * `steps`/`rules` attendus par rôle restent ceux déjà supportés par le
 * renderer et l'Oracle (`renderers/workflow-shared.mjs`,
 * `oracles/workflow-runtime-oracle.mjs`) — cette limite est réelle et
 * documentée, pas contournée ici. Baseline de non-régression :
 * `node --test workflow-action.test.mjs` (cas `requests-workflow`
 * inchangé, toujours vocabulaire take/qualify/export).
 * @see docs/architecture/taches-restantes.md, entrée PLAT-4bis.
 */
const expectedStepsByRole = {
    entry: [
        'external_call:{id}',
        'notify:{id}',
        'refresh:queues',
        'refresh:tasks',
    ],
    decision: [
        'validate:qualification',
        'external_call:decision',
        'notify:decision',
        'refresh:tasks',
        'refresh:all',
    ],
    export: ['callback:fetch-rows', 'branch:rows', 'await:write-file'],
};
const expectedRulesByRole = {
    entry: [],
    decision: [
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

/**
 * `entry` autorise un motif `{id}` dans les steps attendus (ex.
 * `external_call:{id}`, `notify:{id}`) car ce rôle porte le nom de
 * l'opération elle-même dans ses propres steps (voir
 * `requests-workflow.definition.json` : `external_call:take`,
 * `notify:take`) — ce n'est pas un vocabulaire partagé entre domaines,
 * donc pas figeable en constante littérale comme `decision`/`export`.
 */
function sameOrderWithId(actual, expectedTemplate, id) {
    const expected = expectedTemplate.map((step) => step.replace('{id}', id));
    return JSON.stringify(actual) === JSON.stringify(expected);
}

/**
 * Détecte le rôle structurel d'une opération sans dépendre de son `id`.
 * @param {object} op
 * @returns {'entry' | 'decision' | 'export' | null}
 */
function detectRole(op) {
    if (op.kind === 'export' && op.topology === 'async_callback') {
        return 'export';
    }
    if (op.kind === 'transition' && op.topology === 'sequential') {
        if (op.branches.length === 0) return 'entry';
        if (op.to === 'branch' && op.branches.length === 2) return 'decision';
    }
    return null;
}

export function validateWorkflowActionDefinition(definition) {
    invariant(
        new Set(definition.permissions).size === definition.permissions.length,
        'permissions must not contain duplicates'
    );
    invariant(
        definition.operations.length === 3,
        'operations must declare exactly 3 entries'
    );

    const roles = new Map();
    for (const op of definition.operations) {
        const role = detectRole(op);
        invariant(
            role !== null,
            `${op.id}: does not match a supported structural role (entry, decision, export)`
        );
        invariant(
            !roles.has(role),
            `operations: more than one candidate for role ${role}`
        );
        roles.set(role, op);
    }
    for (const role of ['entry', 'decision', 'export']) {
        invariant(
            roles.has(role),
            `operations must include one operation for role ${role}`
        );
    }

    const entry = roles.get('entry');
    const decision = roles.get('decision');
    const exportOperation = roles.get('export');

    for (const [role, candidate] of roles) {
        const expectedSteps = expectedStepsByRole[role];
        const matchesSteps =
            role === 'entry'
                ? sameOrderWithId(candidate.steps, expectedSteps, candidate.id)
                : JSON.stringify(candidate.steps) ===
                  JSON.stringify(expectedSteps);
        invariant(
            matchesSteps,
            `${candidate.id}: unsupported step composition`
        );
        invariant(
            sameSet(candidate.rules, expectedRulesByRole[role]),
            `${candidate.id}: unsupported rule set`
        );
    }
    invariant(entry.branches.length === 0, 'entry cannot declare branches');
    invariant(
        sameSet(
            decision.branches.map(({ when }) => when),
            ['accepted', 'rejected']
        ),
        'decision requires accepted and rejected branches'
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
