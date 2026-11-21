// X5 C6, réserves R1 à R3 de E sur 9ecb7df9 (validation-X5-C6-B.md) :
// couverture, aucun changement de code. Attendus en LITTÉRAL.
// - R2 : le cas idle est ÉMIS, corps compris, pour une lecture protégée.
// - R1 : une lecture PUBLIQUE est atteignable par le chemin produit (lecture
//   retirée des protected_operations de la session) ; elle est émise
//   `protected: false`, donc son cas idle ne s'exécute pas.
// - R3 : chaque refus de assertQueryOutputBinding, par son message exact, et
//   la contrainte `minimum: 1` du paramètre page (E-f2).
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import test from 'node:test';

import { assertQueryOutputBinding } from './core/data-binding-projection.mjs';
import { planExternalPageComposition } from './core/external-page-composition.mjs';
import { createApplicationSessionFixture } from './test-support/application-session-fixture.mjs';
import {
    compositionFile,
    nullableLabel,
    queryPage,
} from './test-support/external-query-page.mjs';

const DOMAINS = ['observatory', 'equipment-hire'];

// Texte émis par renderCompositionQuerySpec, tel que publié (canonique).
const IDLE_CASE = `        if (query.protected)
            it(
                query.name +
                    ' : session déconnectée, load accepté, aucune requête et état idle',
                async () => {
                    const context = setup({ connected: false });
                    TestBed.tick();
                    accept(context, query.name + '.load', query.input);
                    await settle();
                    expect(context.backend.pending.length).toBe(0);
                    expect(context.read(query.name + '.state')).toBe('idle');
                    const items = context.read(query.name + '.items');
                    expect(items).toEqual([]);
                    expectReadOnly(items);
                }
            );
`;
const entry = (protectedRead) => `const QUERIES = [
    {
        name: 'catalogue',
        initial: true,
        protected: ${protectedRead},
        input: {},
`;

async function querySpec(t, domain, edit) {
    const { options } = await queryPage(t, domain, (input) => {
        nullableLabel(domain, 'Non renseigné')(input);
        edit?.(input);
    });
    const plan = await planExternalPageComposition(options);
    return compositionFile(plan, 'page-composition.queries.spec.ts');
}
const once = (text, part, label) =>
    assert.equal(text.split(part).length, 2, label);

test('R2 : lecture protégée, cas idle émis en entier, une fois', async (t) => {
    for (const domain of DOMAINS) {
        const spec = await querySpec(t, domain);
        once(spec, entry(true), `${domain} : entrée protégée`);
        once(spec, IDLE_CASE, `${domain} : cas idle`);
        once(
            spec,
            'connected: () => options.connected ?? true',
            `${domain} : connected par défaut`
        );
    }
});

test('R1 : lecture publique atteinte par le chemin produit, émise non protégée', async (t) => {
    for (const domain of DOMAINS) {
        const id = `${domain}-catalogue`;
        const spec = await querySpec(t, domain, ({ contract, design }) => {
            contract.operations.find(
                (operation) => operation.id === id
            ).access = {
                mode: 'public',
                security_scheme_ids: [],
                permissions: [],
            };
            const session = design.experiences[0].session;
            session.protected_operations = session.protected_operations.filter(
                (binding) => binding.operation_id !== id
            );
        });
        once(spec, entry(false), `${domain} : entrée publique`);
        assert.ok(!spec.includes('protected: true'), domain);
        // Le cas reste gardé par `query.protected` : il ne s'exécute pas.
        once(spec, IDLE_CASE, `${domain} : cas idle gardé`);
    }
});

const operationOf = async (t, domain) => {
    const data = await createApplicationSessionFixture({ domain });
    t.after(() => rm(data.root, { recursive: true, force: true }));
    const [operation] = data.queryModel.queries;
    return operation;
};
const refusal = (binding, operation) => {
    try {
        assertQueryOutputBinding(binding, operation, (message) => {
            throw new Error(message);
        });
    } catch (error) {
        return error.message;
    }
    return 'accepted';
};

test('R3 : refus de assertQueryOutputBinding, chacun par son message exact', async (t) => {
    const cases = {
        observatory: {
            accepted: {
                id: 'rows',
                response_status: 200,
                model_id: 'observatory-item',
                source_path: ['items'],
            },
            otherModel: 'observatory-items-page',
            wrongPaths: [[], ['data'], ['items', 'items']],
        },
        'equipment-hire': {
            accepted: {
                id: 'rows',
                response_status: 200,
                model_id: 'equipment-hire-items',
            },
            otherModel: 'equipment-hire-item',
            wrongPaths: [['items'], ['data']],
        },
    };
    for (const [domain, { accepted, otherModel, wrongPaths }] of Object.entries(
        cases
    )) {
        const operation = await operationOf(t, domain);
        assert.equal(refusal(accepted, operation), 'accepted', domain);
        assert.equal(
            refusal({ ...accepted, response_status: 201 }, operation),
            'rows response status differs from its query primitive',
            domain
        );
        assert.equal(
            refusal({ ...accepted, model_id: otherModel }, operation),
            'rows response model differs from its query primitive',
            domain
        );
        for (const path of wrongPaths)
            assert.equal(
                refusal({ ...accepted, source_path: path }, operation),
                'rows source path differs from its query primitive',
                `${domain} ${JSON.stringify(path)}`
            );
    }
    // Liste : chemin absent ou vide, les deux acceptés.
    const list = await operationOf(t, 'equipment-hire');
    assert.equal(
        refusal(
            {
                id: 'rows',
                response_status: 200,
                model_id: 'equipment-hire-items',
                source_path: [],
            },
            list
        ),
        'accepted'
    );
});

test('R3 (E-f2) : paramètre page facultatif, entier, minimum 1, seul', async (t) => {
    const paged = await operationOf(t, 'observatory');
    const page = {
        name: 'page',
        type: { kind: 'primitive', name: 'integer' },
        required: false,
        constraints: { minimum: 1 },
    };
    assert.deepEqual(paged.port.input, { kind: 'object', fields: [page] });
    assert.deepEqual(paged.transport.parameters, [
        {
            name: 'page',
            in: 'query',
            source_field: 'page',
            type: page.type,
            required: false,
            constraints: { minimum: 1 },
        },
    ]);
    const list = await operationOf(t, 'equipment-hire');
    assert.deepEqual(list.port.input, { kind: 'none' });
    assert.deepEqual(list.transport.parameters, []);
});
