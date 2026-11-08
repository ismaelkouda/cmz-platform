import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';
import { compileRuntimeObservationBackend } from './adapters/runtime-observation-backend-adapter.mjs';
import { observedBackendFixture } from './test-support/runtime-observation-backend-fixture.mjs';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    loadApplicationDesignDependencies,
    validateApplicationDesign,
    validateApplicationDesignWithDependencies,
} from './core/application-design.mjs';
import {
    backendDefinition,
    sha256,
    writeApplicationDesignFixture,
} from './test-support/application-design-fixture.mjs';
import {
    compileReferenceBackendAdoption,
    compileStructuredBackendDefinition,
    serializeCanonicalBackendContract,
} from './core/structured-backend-adapter.mjs';

const applicationDesignSchema = JSON.parse(
    await readFile(
        new URL('./schemas/application-design.schema.json', import.meta.url),
        'utf8'
    )
);
const backendContractSchema = JSON.parse(
    await readFile(
        new URL('./schemas/backend-contract.schema.json', import.meta.url),
        'utf8'
    )
);

async function fixture() {
    const root = await mkdtemp(join(tmpdir(), 'application-design-'));
    const data = await writeApplicationDesignFixture(
        root,
        backendContractSchema
    );
    const dependencies = await loadApplicationDesignDependencies(
        data.design,
        root,
        backendContractSchema
    );
    assert.deepEqual(dependencies.errors, []);
    return { root, ...data, contracts: dependencies.contracts };
}

function validate(design, contracts) {
    return validateApplicationDesign(
        design,
        applicationDesignSchema,
        contracts
    );
}

test('accepte une conception approuvée multi-page, neutre et entièrement traçable', async () => {
    const data = await fixture();
    assert.deepEqual(validate(data.design, data.contracts), []);
    assert.deepEqual(
        await validateApplicationDesignWithDependencies({
            design: data.design,
            applicationDesignSchema,
            backendContractSchema,
            workspaceRoot: data.root,
        }),
        []
    );
});

test('interdit qu’un backend analogue reference pilote une réalisation', async () => {
    const data = await fixture();
    const entry = data.contracts.get('clean-street-api');
    const contracts = new Map([
        ['clean-street-api', { ...entry, role: 'reference' }],
    ]);
    assert.ok(
        validate(data.design, contracts).some((error) =>
            error.includes('reference backends cannot drive implementation')
        )
    );
});

test('exige chaque champ et paramètre backend obligatoire dans les bindings', async () => {
    const data = await fixture();
    data.design.pages[1].actions[0].input_bindings = [];
    assert.ok(
        validate(data.design, data.contracts).some((error) =>
            error.includes('missing required body field description')
        )
    );
});

test('refuse une page moins protégée que son opération', async () => {
    const data = await fixture();
    data.design.pages[1].access.mode = 'public';
    assert.ok(
        validate(data.design, data.contracts).some((error) =>
            error.includes('page access is weaker')
        )
    );
});

test('refuse une invalidation qui ne cible pas un load de la page', async () => {
    const data = await fixture();
    data.design.pages[1].actions[0].invalidates_load_ids = ['users-list'];
    assert.ok(
        validate(data.design, data.contracts).some((error) =>
            error.includes('unresolved page load users-list')
        )
    );
});

test('borne et trace l’autorisation fine d’une action sans renforcer l’accès de page', async () => {
    const data = await fixture();
    const action = data.design.pages[1].actions[0];
    action.authorization = {
        mode: 'required',
        permissions: ['reports.create'],
        denied_behavior: 'disable',
        evidence: [
            {
                source_id: 'clean-street-brief',
                locator: 'validated-project-sheet',
            },
        ],
    };
    assert.deepEqual(validate(data.design, data.contracts), []);
    assert.equal(data.design.pages[1].access.mode, 'authenticated');

    const unknownEvidence = structuredClone(data.design);
    unknownEvidence.pages[1].actions[0].authorization.evidence[0].source_id =
        'missing-source';
    assert.ok(
        validate(unknownEvidence, data.contracts).some((error) =>
            error.includes('unresolved source missing-source')
        )
    );

    const duplicated = structuredClone(data.design);
    duplicated.pages[1].actions[0].authorization.permissions = [
        'reports.create',
        'reports.create',
    ];
    assert.ok(
        validate(duplicated, data.contracts).some((error) =>
            error.includes('duplicate "reports.create"')
        )
    );
});

test('refuse une permission de navigation tant qu’aucun oracle ne l’exécute', async () => {
    const data = await fixture();
    data.design.pages[0].actions[0].authorization = {
        mode: 'required',
        permissions: ['reports.open'],
        denied_behavior: 'hide',
        evidence: [
            {
                source_id: 'clean-street-brief',
                locator: 'validated-project-sheet',
            },
        ],
    };
    assert.ok(
        validate(data.design, data.contracts).some((error) =>
            error.includes('navigation authorization has no runtime oracle')
        )
    );
});

test('refuse les contrôles non rendus et les destinations inconnues', async () => {
    const data = await fixture();
    data.design.pages[1].regions[0].elements[1].control_ids = [];
    data.design.pages[0].actions[0].destination_page_id =
        'page_3333333333333333';
    const errors = validate(data.design, data.contracts);
    assert.ok(
        errors.some((error) => error.includes('unrendered control description'))
    );
    assert.ok(
        errors.some((error) => error.includes('unresolved destination page'))
    );
});

test('une conception approuvée refuse inconnues, page inaccessible et état offline absent', async () => {
    const data = await fixture();
    data.design.unknowns.push({
        id: 'unknown-backend',
        question: 'Which backend is authoritative?',
        blocking: true,
        owner: 'product-owner',
    });
    data.design.pages[0].actions = [];
    data.design.pages[0].regions[0].elements[1].action_ids = [];
    data.design.pages[1].states = data.design.pages[1].states.filter(
        (state) => state.kind !== 'offline'
    );
    const errors = validate(data.design, data.contracts);
    assert.ok(
        errors.some((error) =>
            error.includes('approved design cannot contain unknowns')
        )
    );
    assert.ok(errors.some((error) => error.includes('unreachable page')));
    assert.ok(errors.some((error) => error.includes('needs an offline state')));
});

test('refuse toute fuite de framework dans le modèle neutre', async () => {
    const data = await fixture();
    data.design.pages[0].purpose = 'Render this page with Angular.';
    assert.ok(
        validate(data.design, data.contracts).some((error) =>
            error.includes('target-specific token forbidden')
        )
    );
});

test('lie chaque donnée visible à un statut, modèle et champ backend exacts', async () => {
    const data = await fixture();
    data.design.pages[1].data_bindings.push({
        id: 'created-report',
        operation_ref: {
            contract_id: 'clean-street-api',
            operation_id: 'create-report',
        },
        response_status: 201,
        model_id: 'report',
        field_names: ['missing'],
        visible_in_state_ids: ['submitted'],
    });
    data.design.pages[1].regions[0].elements[1].data_binding_ids.push(
        'created-report'
    );
    assert.ok(
        validate(data.design, data.contracts).some((error) =>
            error.includes('unresolved field missing')
        )
    );
});

test('vérifie les snapshots et refuse hash périmé ou lien symbolique', async () => {
    const stale = await fixture();
    await writeFile(
        join(stale.root, 'design/project-brief.md'),
        '# Clean Street\nchanged\n'
    );
    assert.ok(
        (
            await validateApplicationDesignWithDependencies({
                design: stale.design,
                applicationDesignSchema,
                backendContractSchema,
                workspaceRoot: stale.root,
            })
        ).some((error) => error.includes('sha256 mismatch'))
    );

    const linked = await fixture();
    await symlink(
        join(linked.root, 'design/project-brief.md'),
        join(linked.root, 'design/brief-link.md')
    );
    linked.design.sources[0].snapshot_uri = 'design/brief-link.md';
    assert.ok(
        (
            await validateApplicationDesignWithDependencies({
                design: linked.design,
                applicationDesignSchema,
                backendContractSchema,
                workspaceRoot: linked.root,
            })
        ).some((error) => error.includes('symbolic path forbidden'))
    );
});

test('R2 reference contract cannot drive an application by accidental lifecycle promotion', async (t) => {
    const observed = await observedBackendFixture(t);
    const { contract } = await compileRuntimeObservationBackend(
        observed.options
    );
    const data = await fixture();
    const reference = data.design.backend_contracts[0];
    const entry = data.contracts.get(reference.id);
    data.contracts.set(reference.id, { ...entry, role: 'reference', contract });
    assert.ok(
        validate(data.design, data.contracts).some((error) =>
            error.includes('reference backends cannot drive implementation')
        )
    );
});

test('une cible adoptée explicitement est consommable, la référence reste refusée', async () => {
    const data = await fixture();
    const sourceDefinition = backendDefinition();
    sourceDefinition.contract.status = 'reference';
    sourceDefinition.source.authority = 'observational';
    const sourcePath = 'contracts/reference.definition.json';
    const sourceBytes = Buffer.from(
        JSON.stringify(sourceDefinition, null, 2) + '\n'
    );
    await writeFile(join(data.root, sourcePath), sourceBytes);
    const reference = compileStructuredBackendDefinition({
        definition: sourceDefinition,
        snapshotUri: sourcePath,
        snapshotSha256: sha256(sourceBytes),
        backendContractSchema,
    });
    const referencePath = 'contracts/reference.backend.json';
    const referenceBytes = Buffer.from(
        serializeCanonicalBackendContract(reference)
    );
    await writeFile(join(data.root, referencePath), referenceBytes);
    const binding = data.design.backend_contracts[0];
    binding.snapshot_uri = referencePath;
    binding.sha256 = sha256(referenceBytes);
    const refused = await loadApplicationDesignDependencies(
        data.design,
        data.root,
        backendContractSchema
    );
    assert.ok(refused.errors.some((error) => /reference|target/.test(error)));

    const decisionPath = 'contracts/decision.json';
    const decisionBytes = Buffer.from('{"decision":"adopt this reference"}\n');
    await writeFile(join(data.root, decisionPath), decisionBytes);
    const adoption = {
        schema_version: '1.1.0',
        kind: 'backend-contract-definition',
        contract: {
            ...reference.contract,
            status: 'planned',
            version: '1.0.1',
        },
        source: { id: 'clean-street-adoption', authority: 'declared' },
        basis: { snapshot_uri: referencePath, sha256: sha256(referenceBytes) },
        decision: { snapshot_uri: decisionPath, sha256: sha256(decisionBytes) },
    };
    const adoptionPath = 'contracts/adoption.json';
    const adoptionBytes = Buffer.from(JSON.stringify(adoption, null, 2) + '\n');
    await writeFile(join(data.root, adoptionPath), adoptionBytes);
    const target = compileReferenceBackendAdoption({
        definition: adoption,
        basis: reference,
        basisSha256: sha256(referenceBytes),
        snapshotUri: adoptionPath,
        snapshotSha256: sha256(adoptionBytes),
        backendContractSchema,
    });
    const targetBytes = Buffer.from(serializeCanonicalBackendContract(target));
    binding.snapshot_uri = 'contracts/target.backend.json';
    binding.sha256 = sha256(targetBytes);
    await writeFile(join(data.root, binding.snapshot_uri), targetBytes);
    assert.deepEqual(
        await validateApplicationDesignWithDependencies({
            design: data.design,
            applicationDesignSchema,
            backendContractSchema,
            workspaceRoot: data.root,
        }),
        []
    );
    assert.deepEqual(
        await readFile(join(data.root, referencePath)),
        referenceBytes
    );
    assert.equal(target.contract.status, 'planned');
    assert.ok(
        target.sources.every((source) => source.status !== 'verified-live')
    );
});

test('application 1.1 : le statut reference reste interdit et les nouveaux pointeurs restent déclarés', async (t) => {
    const data = await createApplicationSessionFixture();
    t.after(() => rm(data.root, { recursive: true, force: true }));
    assert.deepEqual(validate(data.design, data.contracts), []);
    const entry = data.contracts.get(data.contract.contract.id);
    const contracts = new Map([
        [data.contract.contract.id, { ...entry, role: 'reference' }],
    ]);
    assert.notDeepEqual(validate(data.design, contracts), []);
    const changed = structuredClone(data.design);
    changed.experiences[0].session.projection.permissions_pointer =
        '/' + data.names.subject + '/is_admin';
    assert.notDeepEqual(validate(changed, data.contracts), []);
});
