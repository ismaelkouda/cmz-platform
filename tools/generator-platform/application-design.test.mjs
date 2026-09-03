import assert from 'node:assert/strict';
import { mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
    loadApplicationDesignDependencies,
    validateApplicationDesign,
    validateApplicationDesignWithDependencies,
} from './core/application-design.mjs';
import { writeApplicationDesignFixture } from './test-support/application-design-fixture.mjs';

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
