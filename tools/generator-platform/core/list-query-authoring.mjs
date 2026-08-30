/**
 * Périmètre restreint (2026-08-30) : premier verbe structurel "query" du
 * générateur, à côté de "command" (action-request) — voir ADR-0027 pour la
 * distinction Collection/action-request. Volontairement borné à "List
 * simple" : une opération GET publique ou authentifiée, sans paramètre,
 * qui renvoie une liste plate d'objets à champs primitifs uniquement.
 * Non couvert ici, par choix documenté (pas un oubli) : pagination/filtres,
 * types "model" imbriqués, opaque_types, permissions "authorized".
 * Rouvrir ce fichier seulement si un second cas réel l'exige (même
 * discipline que PLAT-4ter pour workflow-action).
 *
 * Réutilise tel quel `schemas/semantic-model.schema.json` et
 * `schemas/evidence.schema.json` : les deux supportaient déjà
 * `typeRef.kind: "list"` et `operation.kind: "query"` avant ce chantier
 * (vérifié dans le schéma avant d'écrire ce fichier, pas supposé) — aucune
 * modification du cœur partagé n'a donc été nécessaire pour cette tranche.
 */
const primitiveNames = new Set([
    'boolean',
    'date',
    'datetime',
    'decimal',
    'integer',
    'json',
    'string',
    'uuid',
]);

function invariant(condition, message) {
    if (!condition) throw new Error(`list-query definition: ${message}`);
}

function ensureUnique(entries, label) {
    const seen = new Set();
    for (const entry of entries) {
        invariant(!seen.has(entry.id), `duplicate ${label} ${entry.id}`);
        seen.add(entry.id);
    }
}

function validateFields(fields, path) {
    const names = new Set();
    for (const field of fields) {
        invariant(!names.has(field.name), `${path}: duplicate ${field.name}`);
        names.add(field.name);
        invariant(
            primitiveNames.has(field.type.name),
            `${path}.${field.name}: unknown primitive ${field.type.name}`
        );
    }
}

export function validateListQueryDefinition(definition) {
    ensureUnique(definition.operations, 'operation');
    for (const operation of definition.operations) {
        validateFields(operation.item.fields, `${operation.id}.item`);
        invariant(
            operation.access.mode !== 'authenticated' ||
                operation.http.authentication !== 'none',
            `${operation.id}: authenticated access requires an authentication mechanism`
        );
        invariant(
            operation.access.mode !== 'public' ||
                operation.http.authentication === 'none',
            `${operation.id}: public access requires authentication none`
        );
    }
    return definition;
}

function fact(id, category, statement, sourceId) {
    return {
        id,
        category,
        statement,
        evidence_refs: [sourceId],
        confidence: 1,
        status: 'asserted',
    };
}

const NO_INPUT_TYPE = 'list-query-no-input';

export function compileListQueryDefinition(
    definition,
    { sourceUri, sourceSha256 }
) {
    validateListQueryDefinition(definition);
    const sourceId = 'source.list-query-definition';
    const noInputFactId = `fact.${definition.feature.id}.no-input`;
    const facts = [
        fact(
            noInputFactId,
            'data_shape',
            'List queries in this restricted scope take no input parameter.',
            sourceId
        ),
    ];
    const types = [
        {
            id: NO_INPUT_TYPE,
            kind: 'opaque',
            description: 'Marker type: this operation takes no input.',
            fields: [],
            evidence_refs: [noInputFactId],
        },
    ];
    const operations = [];
    const integrations = [];
    const emittedItems = new Set();

    for (const operation of definition.operations) {
        const operationFactId = `fact.${operation.id}.operation`;
        const itemFactId = `fact.${operation.id}.item`;
        facts.push(
            fact(operationFactId, 'operation', operation.description, sourceId),
            fact(itemFactId, 'data_shape', operation.item.description, sourceId)
        );
        if (!emittedItems.has(operation.item.id)) {
            emittedItems.add(operation.item.id);
            types.push({
                id: operation.item.id,
                kind: 'object',
                description: operation.item.description,
                fields: operation.item.fields.map((field) => ({
                    name: field.name,
                    type: field.type,
                    required: field.required,
                    evidence_refs: [itemFactId],
                })),
                evidence_refs: [itemFactId],
            });
        }
        operations.push({
            id: operation.id,
            kind: 'query',
            description: operation.description,
            input: { kind: 'model', name: NO_INPUT_TYPE, nullable: false },
            output: {
                kind: 'list',
                nullable: false,
                items: {
                    kind: 'model',
                    name: operation.item.id,
                    nullable: false,
                },
            },
            access: {
                mode: operation.access.mode,
                evidence_refs: [operationFactId],
            },
            effects: [
                {
                    kind: 'external_call',
                    description: `Fetches ${operation.item.id} entries from the backend.`,
                    evidence_refs: [operationFactId],
                },
            ],
            integration_ref: `integration.${operation.id}`,
            evidence_refs: [operationFactId, itemFactId],
        });
        integrations.push({
            id: `integration.${operation.id}`,
            kind: 'http',
            method: operation.http.method,
            path: operation.http.path,
            authentication: operation.http.authentication,
            response_envelope: operation.http.response_envelope ?? 'none',
            evidence_refs: [operationFactId],
        });
    }

    const evidence = {
        schema_version: '1.0.0',
        model_id: `${definition.feature.id}-list-query-definition-evidence`,
        sources: [
            {
                id: sourceId,
                kind: 'specification',
                uri: sourceUri,
                sha256: sourceSha256,
            },
        ],
        facts,
        unknowns: [
            {
                id: 'unknown.backend-contract-authority',
                question:
                    'Does an independent backend contract confirm this declaration?',
                impact: 'Generation can verify internal consistency but not the deployed backend.',
                blocking: false,
                evidence_refs: [sourceId],
            },
        ],
        decisions: [],
    };
    const semantic = {
        schema_version: '1.0.0',
        model_id: `${definition.feature.id}-list-query-semantic`,
        domain: definition.feature,
        types,
        operations,
        constraints: [],
        integrations,
    };
    return { evidence, semantic };
}
