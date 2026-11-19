import { isDeepStrictEqual } from 'node:util';

import { projectSelectedOpenApiRequest } from './runtime-observation-adapter.mjs';
import { validateBackendContract } from '../core/backend-contract.mjs';
import {
    loadObservedBackendInputs,
    observationPointerToken,
} from '../core/runtime-observation-backend-inputs.mjs';
import {
    observationInputPrimitives as io,
    observationDiagnostic,
    rejectObservation as fail,
    resolveObservationPointer as pointer,
} from '../core/runtime-observation-evidence.mjs';

const evidence = (source_id, locator) => [{ source_id, locator }];
const unique = (values) => {
    if (new Set(values).size !== values.length) fail('OBS_IDENTITY');
};

function reachable(root, models) {
    const used = new Set();
    const visit = (type) => {
        if (type?.kind === 'array') return visit(type.items);
        if (type?.kind !== 'model') return;
        if (used.has(type.model_id)) return;
        const model = models.get(type.model_id);
        if (!model) fail('OBS_COMPLEMENT');
        if (used.size >= 32) fail('OBS_LIMIT');
        used.add(model.id);
        if (model.kind === 'array') visit(model.items);
        else if (model.kind === 'scalar') visit(model.type);
        else {
            for (const field of model.fields) visit(field.type);
            if (model.additional_properties) visit(model.additional_properties);
        }
    };
    visit({ kind: 'model', model_id: root });
    return used;
}

// Reconcile only structural facts. Required/nullable/item types always come
// from explicit sourced declarations. Finite witnesses bound recursive graphs.
function witness(shape, type, models, nullable = false, depth = 0) {
    if (depth > 24) fail('OBS_LIMIT');
    if (shape.kind === 'null') {
        if (!nullable && !(type.kind === 'primitive' && type.name === 'null'))
            fail('OBS_CONFLICT');
        return;
    }
    if (type.kind === 'model') {
        const model = models.get(type.model_id);
        if (!model) fail('OBS_COMPLEMENT');
        if (model.kind === 'scalar')
            return witness(shape, model.type, models, nullable, depth + 1);
        if (model.kind === 'array')
            return witness(
                shape,
                { kind: 'array', items: model.items },
                models,
                nullable,
                depth + 1
            );
        if (shape.kind === 'map') {
            if (
                model.fields.length ||
                !model.additional_properties ||
                shape.entries > 128 ||
                shape.values.length > 128
            )
                fail('OBS_CONFLICT');
            if (shape.entries > 0 && !shape.values.length)
                fail('OBS_COMPLEMENT');
            for (const child of shape.values)
                witness(
                    child,
                    model.additional_properties,
                    models,
                    false,
                    depth + 1
                );
            return;
        }
        if (shape.kind !== 'object' || shape.fields.length > 32)
            fail('OBS_CONFLICT');
        unique(shape.fields.map((field) => field.name));
        const fields = new Map(
            model.fields.map((field) => [field.name, field])
        );
        for (const observed of shape.fields) {
            const declared = fields.get(observed.name);
            if (!declared) {
                if (!model.additional_properties) fail('OBS_COMPLEMENT');
                witness(
                    observed.shape,
                    model.additional_properties,
                    models,
                    false,
                    depth + 1
                );
            } else {
                if (observed.optional_observed === true && declared.required)
                    fail('OBS_CONFLICT');
                witness(
                    observed.shape,
                    declared.type,
                    models,
                    declared.nullable,
                    depth + 1
                );
            }
        }
        for (const field of model.fields)
            if (
                field.required &&
                !shape.fields.some((entry) => entry.name === field.name)
            )
                fail('OBS_CONFLICT');
        return;
    }
    if (type.kind === 'array') {
        if (
            shape.kind !== 'array' ||
            shape.min_length > shape.max_length ||
            shape.items.length > 128
        )
            fail('OBS_CONFLICT');
        if (shape.max_length > 0 && !shape.items.length) fail('OBS_COMPLEMENT');
        for (const child of shape.items)
            witness(child, type.items, models, false, depth + 1);
        return;
    }
    if (type.kind !== 'primitive') fail('OBS_COMPLEMENT');
    if (type.name === 'json') return; // Explicit unconstrained JSON only.
    const kind = ['date', 'datetime', 'uuid', 'binary'].includes(type.name)
        ? 'string'
        : type.name;
    if (
        shape.kind !== 'scalar' ||
        !(
            shape.type === kind ||
            (kind === 'integer' && shape.type === 'number')
        )
    )
        fail('OBS_CONFLICT');
    // A number witness does NOT prove integer; the declaration is the source
    // for the stronger type, and the actual runtime is qualified separately.
}

function technicalDescriptions(document) {
    for (const schema of Object.values(document.components?.schemas ?? {})) {
        schema.description ??= 'Modèle de requête sélectionné.';
        for (const property of Object.values(schema.properties ?? {}))
            property.description ??= 'Champ de requête sélectionné.';
    }
    for (const item of Object.values(document.paths))
        for (const operation of Object.values(item)) {
            for (const parameter of operation.parameters ?? [])
                if (!parameter.$ref)
                    parameter.description ??=
                        'Paramètre de requête sélectionné.';
        }
    for (const parameter of Object.values(
        document.components?.parameters ?? {}
    ))
        parameter.description ??= 'Paramètre de requête sélectionné.';
    for (const scheme of Object.values(
        document.components?.securitySchemes ?? {}
    ))
        scheme.description ??= 'Schéma de sécurité sélectionné.';
    return document;
}

function sourceClaims(claims, selection) {
    const matches = claims.operations.filter(
        (claim) => claim.id === selection.id
    );
    if (matches.length !== 1) fail('OBS_COMPLEMENT');
    const claim = matches[0];
    if (
        claim.method !== selection.method ||
        claim.path !== selection.path ||
        !claim.evidence.length
    )
        fail('OBS_CONFLICT');
    return claim;
}

function mergeById(target, entries) {
    for (const entry of entries) {
        const old = target.get(entry.id);
        if (old && !isDeepStrictEqual(old, entry)) fail('OBS_CONFLICT');
        target.set(entry.id, entry);
    }
}

function responseWitness(input, operation, selection, declarations, used) {
    const caseValue = pointer(input.witnesses, selection.shape_pointer);
    if (
        !input.witnesses.cases.includes(caseValue) ||
        caseValue.id !== selection.case_id ||
        caseValue.method !== operation.method ||
        caseValue.path !== operation.path ||
        caseValue.status !== selection.status
    )
        fail('OBS_BINDING');
    const body = pointer(caseValue.shape, selection.body_pointer);
    if (selection.envelope.kind !== 'none') {
        const expected = `/fields/${caseValue.shape.fields?.findIndex((field) => field.name === selection.envelope.data_field)}/shape`;
        if (selection.body_pointer !== expected) fail('OBS_BINDING');
        for (const key of ['data_field', 'error_field', 'message_field'])
            if (
                selection.envelope[key] &&
                !caseValue.shape.fields?.some(
                    (field) => field.name === selection.envelope[key]
                )
            )
                fail('OBS_BINDING');
    } else if (selection.body_pointer !== '') fail('OBS_BINDING');
    witness(
        body,
        { kind: 'model', model_id: selection.model_id },
        declarations
    );
    for (const id of reachable(selection.model_id, declarations)) used.add(id);
}

function errorResponse(input, operation, selection, claim, declarations, used) {
    responseWitness(input, operation, selection, declarations, used);
    const declarationIndex = claim.error_responses.findIndex(
        (candidate) => candidate.status === selection.status
    );
    const sourceIndex = input.responseSelections.findIndex(
        (candidate) =>
            candidate.operation_id === operation.id &&
            candidate.status === selection.status &&
            candidate.outcome === 'error'
    );
    if (declarationIndex < 0 || sourceIndex < 0) fail('OBS_COMPLEMENT');
    const proof = [
        ...evidence('openapi', `#/response_selections/${sourceIndex}`),
        ...evidence(
            'declarations',
            `#/operations/${input.claims.operations.indexOf(claim)}/error_responses/${declarationIndex}`
        ),
        ...evidence('observations', `#${selection.shape_pointer}`),
    ];
    return {
        status: selection.status,
        outcome: 'error',
        description:
            selection.documentation === 'observed-only'
                ? 'Erreur observée, absente de la documentation OpenAPI.'
                : 'Erreur documentée et observée, structure sélectionnée.',
        evidence: proof,
        body: {
            media_type: 'application/json',
            model_id: selection.model_id,
            envelope: selection.envelope,
            evidence: proof,
        },
    };
}

export async function compileRuntimeObservationBackend(options) {
    try {
        const input = await loadObservedBackendInputs(options);
        const { definition, claims } = input;
        unique(claims.models.map((model) => model.id));
        for (const model of claims.models) {
            if (!model.evidence.length) fail('OBS_COMPLEMENT');
            if (model.kind === 'object') {
                unique(model.fields.map((field) => field.name));
                if (
                    model.fields.length > 32 ||
                    model.fields.some((field) => !field.evidence.length)
                )
                    fail('OBS_COMPLEMENT');
            }
        }
        const declarations = new Map(
            claims.models.map((model) => [model.id, model])
        );
        const used = new Set();
        const models = new Map();
        const schemes = new Map();
        const operations = [];
        const selected = technicalDescriptions(structuredClone(input.selected));
        unique(input.witnesses.cases.map((entry) => entry.id));
        if (
            input.witnesses.cases.length > 16 ||
            claims.operations.length > 8 ||
            claims.fragments.length > 32
        )
            fail('OBS_LIMIT');
        for (const selection of definition.operations) {
            const claim = sourceClaims(claims, selection);
            responseWitness(input, selection, selection, declarations, used);
            const doc = structuredClone(selected);
            const operation =
                doc.paths[selection.source_path][
                    selection.method.toLowerCase()
                ];
            const explicit = Object.hasOwn(operation, 'security');
            if (!explicit) {
                // Missing security never means public. A traceable claim is
                // materialized as native requirements and checked below.
                doc.components.securitySchemes ??= Object.create(null);
                for (const scheme of claims.security_schemes) {
                    if (scheme.kind !== 'bearer') fail('OBS_COMPLEMENT');
                    doc.components.securitySchemes[scheme.id] = {
                        type: 'http',
                        scheme: 'bearer',
                        description: 'Schéma de sécurité sourcé.',
                    };
                }
                operation.security =
                    claim.access.mode === 'public'
                        ? []
                        : [
                              Object.fromEntries(
                                  claim.access.security_scheme_ids.map((id) => [
                                      id,
                                      [],
                                  ])
                              ),
                          ];
            }
            const projected = projectSelectedOpenApiRequest(
                doc,
                {
                    path: selection.source_path,
                    method: selection.method,
                    operation_id: selection.id,
                },
                'openapi',
                { extended: true }
            );
            if (!isDeepStrictEqual(projected.access, claim.access))
                fail('OBS_CONFLICT');
            if (claim.parameters) {
                for (const parameter of claim.parameters) {
                    const previous = projected.request.parameters.find(
                        (entry) =>
                            entry.name === parameter.name &&
                            entry.in === parameter.in
                    );
                    const value = {
                        ...parameter,
                        description: 'Paramètre de requête sourcé.',
                        evidence: evidence(
                            'declarations',
                            `#/operations/${claims.operations.indexOf(claim)}/parameters/${claim.parameters.indexOf(parameter)}`
                        ),
                    };
                    if (previous) {
                        for (const key of ['required', 'type', 'constraints'])
                            if (!isDeepStrictEqual(previous[key], value[key]))
                                fail('OBS_CONFLICT');
                    } else projected.request.parameters.push(value);
                }
            }
            if (!explicit) {
                for (const scheme of projected.security_schemes)
                    scheme.evidence = evidence(
                        'declarations',
                        `#/security_schemes/${claims.security_schemes.findIndex((entry) => entry.id === scheme.id)}`
                    );
            }
            const pending = [projected];
            while (pending.length) {
                const value = pending.pop();
                if (!value || typeof value !== 'object') continue;
                if (Object.hasOwn(value, 'description'))
                    value.description = 'Structure de requête sélectionnée.';
                if (value.source_id === 'openapi')
                    value.locator = '#/document' + value.locator.slice(1);
                pending.push(...Object.values(value));
            }
            mergeById(models, projected.models);
            mergeById(schemes, projected.security_schemes);
            const opEvidence = [
                ...evidence(
                    'openapi',
                    `#/document/paths/${observationPointerToken(selection.source_path)}/${selection.method.toLowerCase()}`
                ),
                ...evidence(
                    'declarations',
                    `#/operations/${claims.operations.indexOf(claim)}`
                ),
                ...evidence('observations', `#${selection.shape_pointer}`),
            ];
            operations.push({
                id: selection.id,
                service_id: definition.service.id,
                status: 'reference',
                description: 'Opération observée sélectionnée.',
                method: selection.method,
                path: selection.path,
                access: claim.access,
                request: projected.request,
                responses: [
                    {
                        status: selection.status,
                        outcome: 'success',
                        description: 'Cas de réponse structurelle sélectionné.',
                        evidence: opEvidence,
                        body: {
                            media_type: 'application/json',
                            model_id: selection.model_id,
                            envelope: selection.envelope,
                            evidence: opEvidence,
                        },
                    },
                    ...(definition.schema_version === '1.3.0'
                        ? selection.error_responses.map((response) =>
                              errorResponse(
                                  input,
                                  selection,
                                  response,
                                  claim,
                                  declarations,
                                  used
                              )
                          )
                        : []),
                ],
                evidence: opEvidence,
            });
        }
        for (const id of used) {
            if (models.has(id)) fail('OBS_IDENTITY');
            const model = declarations.get(id);
            const modelIndex = claims.models.indexOf(model);
            const proof = evidence('declarations', `#/models/${modelIndex}`);
            models.set(id, {
                ...model,
                status: 'reference',
                description: 'Modèle de réponse sourcé.',
                evidence: proof,
                ...(model.kind === 'object'
                    ? {
                          fields: model.fields.map((field, index) => ({
                              ...field,
                              description: 'Champ de réponse sourcé.',
                              evidence: evidence(
                                  'declarations',
                                  `#/models/${modelIndex}/fields/${index}`
                              ),
                          })),
                      }
                    : {}),
            });
        }
        const contract = {
            schema_version: '1.1.0',
            kind: 'backend-contract',
            contract: {
                ...definition.contract,
                title: 'Contrat backend sélectionné',
                status: 'reference',
                description:
                    'Compilation structurelle ; exécution et couverture des variantes restent distinctes.',
            },
            sources: input.snapshots.map((snapshot) => ({
                id: snapshot.id,
                kind:
                    snapshot.id === 'openapi'
                        ? 'openapi'
                        : snapshot.id === 'observations'
                          ? 'runtime-observation'
                          : 'manual',
                authority: 'observational',
                status: 'reference',
                snapshot_uri: snapshot.path,
                sha256: snapshot.sha256,
            })),
            services: [
                {
                    ...definition.service,
                    status: 'reference',
                    description:
                        'Service résolu par une liaison privée au runtime.',
                    evidence: evidence('declarations', '#/service_evidence'),
                },
            ],
            security_schemes: [...schemes.values()],
            models: [...models.values()].sort((a, b) =>
                a.id.localeCompare(b.id)
            ),
            operations,
        };
        const schema = io.parseSchema(
            Buffer.from(JSON.stringify(options.backendContractSchema))
        );
        if (validateBackendContract(contract, schema).length)
            fail('OBS_MODELS');
        return { ...input, contract };
    } catch (error) {
        fail(observationDiagnostic(error));
    }
}
