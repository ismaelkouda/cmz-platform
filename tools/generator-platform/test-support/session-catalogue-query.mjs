// Lecture « catalogue » de la fixture de session (X5 C2). Une lecture de
// session est au profil EXTÉRIEUR : politique honnête `bypass`, échec qui
// efface les lignes (`on_error: clear`), décodeur projeté sur les champs lus
// (D-X5-2, D-X5-4, D-X5-6). Défaut possédé corrigé : la fixture déclarait
// `cache: host/principal`, sans consommateur de cache dans la coque.
import { readFile } from 'node:fs/promises';

import { EXTERNAL_LIST_QUERY_EXECUTION } from '../core/list-query-external-profile.mjs';
import { compileListQueryV2ExecutionModel } from '../core/list-query-v2-compiler.mjs';

// X5 C6 (B) : forme de la lecture « catalogue » dans le contrat de la
// fixture. Observatory lit une PAGE (même forme que Régions : paramètre de
// requête `page`, entier, facultatif, seul) ; equipment-hire, une liste.
const primitive = (name) => ({ kind: 'primitive', name });
const array = (items) => ({ kind: 'array', items });

export function catalogueContractShape({ alternate, object, field, model }) {
    if (alternate) return { output: 'items', models: [], parameters: [] };
    return {
        output: 'items-page',
        models: [
            object('items-page', [
                field('items', array(model('item'))),
                field('current_page', primitive('integer')),
                field('last_page', primitive('integer')),
                field('per_page', primitive('integer')),
                field('total', primitive('integer')),
            ]),
        ],
        parameters: [
            {
                name: 'page',
                in: 'query',
                description: 'One-based page, optional; page 1 when absent.',
                required: false,
                type: primitive('integer'),
                constraints: { minimum: 1 },
            },
        ],
    };
}

// Définition de la lecture « catalogue » (profil extérieur), aussi écrite dans
// un produit extérieur par la fixture de C3a.
export async function sessionCatalogueDefinition({ domain, backendReference }) {
    const definition = JSON.parse(
        await readFile(
            new URL(
                '../fixtures/site-group-select.v2.definition.json',
                import.meta.url
            ),
            'utf8'
        )
    );
    definition.feature = {
        id: domain + '-catalogue-feature',
        name: 'Fixture catalogue',
        description: 'Synthetic fixture.',
    };
    definition.backend_contract = backendReference;
    const query = definition.operations[0];
    query.id = domain + '-catalogue';
    query.operation_ref.operation_id = query.id;
    query.read_model = {
        id: domain + '-item-projection',
        description: 'Fixture row.',
        fields: [
            { name: 'id', source_field: 'id' },
            { name: 'label', source_field: 'label' },
        ],
    };
    query.execution = structuredClone(EXTERNAL_LIST_QUERY_EXECUTION);
    // X5 C6 (B) : observatory lit une PAGE (paramètre de requête `page`
    // facultatif, seul) ; equipment-hire, une liste.
    if (domain !== 'equipment-hire') {
        query.input = {
            fields: [
                { name: 'page', parameter_ref: { name: 'page', in: 'query' } },
            ],
        };
        query.result = {
            kind: 'page',
            items_field: 'items',
            page_fields: {
                currentPage: 'current_page',
                lastPage: 'last_page',
                pageSize: 'per_page',
                totalItems: 'total',
            },
        };
    }
    return definition;
}

export async function compileSessionCatalogueQuery({
    domain,
    backend,
    backendReference,
}) {
    const definition = await sessionCatalogueDefinition({
        domain,
        backendReference,
    });
    return compileListQueryV2ExecutionModel({
        definition,
        backendContractDocument: backend.document,
        backendContractUri: backend.uri,
        profile: 'external',
    });
}
