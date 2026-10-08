import assert from 'node:assert/strict';
import test from 'node:test';

import {
    collectAgentModelViolations,
    readAgentModelDocuments,
} from './check-agent-operating-model.mjs';

test('the repository exposes a complete guarded agent operating model', () => {
    assert.deepEqual(
        collectAgentModelViolations(readAgentModelDocuments()),
        []
    );
});

test('the guard rejects the loss of a role route', () => {
    const documents = readAgentModelDocuments();
    documents.agents = documents.agents.replace('$cmz-step-executor', 'worker');

    assert.ok(
        collectAgentModelViolations(documents).some((violation) =>
            violation.includes('$cmz-step-executor')
        )
    );
});

test('the guard rejects a specialist that is no longer read-only by default', () => {
    const documents = readAgentModelDocuments();
    documents.model = documents.model.replace(
        'Le mode par défaut est en lecture seule',
        'Le mode par défaut peut écrire'
    );

    assert.ok(
        collectAgentModelViolations(documents).some((violation) =>
            violation.includes('lecture seule')
        )
    );
});

test('the guard rejects a misleading slash invocation for a skill', () => {
    const documents = readAgentModelDocuments();
    documents.userGuide += '\nUtiliser /cmz-steward pour commencer.\n';

    assert.ok(
        collectAgentModelViolations(documents).some((violation) =>
            violation.includes('fausse commande slash')
        )
    );
});

test('the guard rejects loss of the owner-facing approval controls', () => {
    const documents = readAgentModelDocuments();
    documents.userGuide = documents.userGuide.replace(
        'Contrôler la fin sans lire tout le code',
        'Fin'
    );

    assert.ok(
        collectAgentModelViolations(documents).some((violation) =>
            violation.includes('contrôle non technique')
        )
    );
});

test('the guard rejects invalid skill metadata even when prose remains', () => {
    const documents = readAgentModelDocuments();
    documents.executor = documents.executor.replace(
        'name: cmz-step-executor',
        'name: wrong-role'
    );
    documents.orchestratorUi = 'interface: [invalid';

    const violations = collectAgentModelViolations(documents);
    assert.ok(
        violations.some((violation) => violation.includes('nom découvrable'))
    );
    assert.ok(
        violations.some((violation) => violation.includes('openai.yaml'))
    );
});

test('the guard rejects privilege escalation in the structured contract', () => {
    const documents = readAgentModelDocuments();
    const contract = JSON.parse(documents.contract);
    contract.roles.orchestrator.may_implement_by_default = true;
    contract.roles['task-specialist'].modes.review = true;
    contract.rules.self_promotion_allowed = true;
    documents.contract = JSON.stringify(contract);

    const violations = collectAgentModelViolations(documents);
    assert.ok(
        violations.some((violation) =>
            violation.includes('review indépendante')
        )
    );
    assert.ok(
        violations.some((violation) =>
            violation.includes('frontières de mutation')
        )
    );
    assert.ok(violations.some((violation) => violation.includes('mode fix')));
});

test('the guard rejects removal of a required handoff field', () => {
    const documents = readAgentModelDocuments();
    const contract = JSON.parse(documents.contract);
    contract.handoff_required_fields.pop();
    documents.contract = JSON.stringify(contract);

    assert.ok(
        collectAgentModelViolations(documents).some((violation) =>
            violation.includes('douze champs')
        )
    );
});
