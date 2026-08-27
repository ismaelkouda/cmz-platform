import { readFile } from 'node:fs/promises';

/**
 * ============================================================================
 * CŒUR DU DOMAINE "action-request" — NE PAS MODIFIER POUR AJOUTER UNE SOURCE
 * ============================================================================
 *
 * Ce fichier définit le CONTRAT CIBLE que toute source d'entrée (legacy
 * TypeScript, spec JSON structurée, et — à terme — OpenAPI, texte en langage
 * naturel, traces runtime...) doit produire pour être compilée par le
 * générateur de plateforme.
 *
 * Deux fonctions publiques concentrent tout le contrat :
 *   1. `validateObservation(observation)` — valide/normalise la forme neutre
 *      ("observation") que N'IMPORTE QUELLE source doit produire. C'est le
 *      SEUL point de vérité sur "à quoi doit ressembler une observation
 *      valide". Un adaptateur ne fait QUE produire un objet qui passe cette
 *      validation — il n'a jamais besoin de connaître ou de modifier cette
 *      fonction.
 *   2. `buildSemanticModel(observation, policy)` — transforme une observation
 *      déjà validée en modèle sémantique canonique (types, opérations,
 *      contraintes, intégrations HTTP), en s'appuyant sur une `policy`
 *      (fichier `*.policy.json`, ex: `policies/action-request.policy.json`)
 *      qui porte les décisions humaines non déductibles du code source seul
 *      (descriptions, préfixes de contraintes, classification des effets...).
 *
 * Pourquoi ne pas toucher ce fichier pour ajouter une nouvelle source (ex:
 * OpenAPI) : les deux adaptateurs existants
 * (`adapters/legacy-typescript-adapter.mjs`,
 * `adapters/structured-spec-adapter.mjs`) et tout ce qui consomme le modèle
 * sémantique en aval (compilateur, renderers, oracles, fixtures de
 * provenance comme `fixtures/action-request.evidence.json`) dépendent du
 * contrat exact posé ici. Le modifier pour accommoder une source
 * particulière risquerait de casser silencieusement les sources déjà
 * branchées. La bonne pratique du repo : écrire un NOUVEAU fichier adaptateur
 * (ex: `adapters/openapi-adapter.mjs`) qui IMPORTE `validateObservation` en
 * lecture seule et produit une observation conforme — voir
 * `structured-spec-adapter.mjs` comme modèle minimal (23 lignes) de ce que
 * doit faire un adaptateur : lire une source, construire l'observation,
 * la valider, renvoyer aussi un descripteur de provenance (`source` avec
 * `sha256` du contenu lu).
 * ============================================================================
 */

/** Type primitif "string" réutilisable — raccourci pour construire des champs
 * de type chaîne sans répéter la forme `{ kind, name, nullable }` partout. */
export const primitiveString = {
    kind: 'primitive',
    name: 'string',
    nullable: false,
};

/**
 * Normalise un identifiant (camelCase ou kebab-case) vers le format canonique
 * `snake_case` minuscule utilisé partout dans les IDs du modèle sémantique
 * (ex: "loginRequest" ou "login-request" -> "login_request"). Utilisé par les
 * adaptateurs et par la construction des IDs de contraintes/facts.
 */
export function canonicalName(value) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replaceAll('-', '_')
        .toLowerCase();
}

/** Garde-fou minimal : lève une erreur explicite (avec chemin JSON-like dans
 * le message) si la condition est fausse. Toutes les validations de ce
 * fichier "fail closed" — au premier problème, on arrête tout plutôt que de
 * continuer avec des données partiellement valides. */
function assert(condition, message) {
    if (!condition) throw new Error(message);
}

/** Interdit toute clé non explicitement listée dans `allowed` sur `value`.
 * C'est ce qui rend le contrat "fermé" : une source qui ajoute une propriété
 * inconnue (ex: un champ spécifique à une techno particulière qui fuiterait
 * dans le modèle neutre) est rejetée immédiatement, plutôt que silencieusement
 * ignorée. Voir le test "target-specific framework leakage is rejected". */
function assertKeys(value, allowed, path) {
    for (const key of Object.keys(value)) {
        assert(allowed.includes(key), `${path}: unsupported property ${key}`);
    }
}

/**
 * LE CONTRAT D'ENTRÉE — forme exacte qu'une "observation" doit avoir pour
 * être acceptée par le pipeline, quelle que soit sa source d'origine.
 *
 * Structure attendue (voir le corps de la fonction pour le détail exhaustif
 * des règles, ceci est un résumé) :
 * {
 *   schema_version: "1.0.0",           // seule version supportée aujourd'hui
 *   domain_id: "<string>",             // identifiant du domaine métier
 *   operations: [                      // liste des opérations (endpoints)
 *     {
 *       id: "<string>",                // unique dans le tableau
 *       access: "public" | "authenticated" | "authorized",
 *       effects: ["<effect_kind>", ...],   // non vide
 *       http: {
 *         method: "GET"|"POST"|"PUT"|"PATCH"|"DELETE",
 *         path: "<string>",
 *         authentication: "none"|"bearer"|"session"|"api_key"|"other",
 *         response_envelope: <optionnel>,
 *       },
 *       input:  { fields: [<field>, ...] },
 *       output: { fields: [<field>, ...] },
 *     },
 *     ...
 *   ]
 * }
 * où chaque <field> = {
 *   name: "<string>",                  // unique dans son tableau fields
 *   type: { kind: "primitive"|"model", name: "<string>", nullable: <bool> },
 *   required: <bool>,
 *   format: "email" (optionnel, seule valeur supportée aujourd'hui),
 *   equals: "<autre_champ_qualifié>" (optionnel, doit contenir un ".")
 * }
 *
 * Point clé pour un futur adaptateur OpenAPI : OpenAPI exprime les schémas de
 * requête/réponse avec BEAUCOUP plus de vocabulaire que ce contrat n'en
 * accepte (enums, formats variés, unions, références $ref, etc.). Le travail
 * de l'adaptateur n'est PAS de faire évoluer ce contrat pour absorber tout
 * OpenAPI — c'est de PROJETER ce qu'OpenAPI décrit vers ce vocabulaire
 * volontairement restreint, et de lever une erreur explicite (fail closed,
 * pas de dégradation silencieuse) pour tout ce qui n'a pas d'équivalent ici.
 */
export function validateObservation(observation) {
    assertKeys(observation, ['schema_version', 'domain_id', 'operations'], '$');
    assert(
        observation.schema_version === '1.0.0',
        '$.schema_version: unsupported'
    );
    assert(typeof observation.domain_id === 'string', '$.domain_id: required');
    assert(
        Array.isArray(observation.operations),
        '$.operations: array required'
    );

    const operationIds = new Set();
    for (const [
        operationIndex,
        operation,
    ] of observation.operations.entries()) {
        const path = `$.operations[${operationIndex}]`;
        assertKeys(
            operation,
            ['id', 'input', 'output', 'access', 'http', 'effects'],
            path
        );
        assert(
            !operationIds.has(operation.id),
            `${path}.id: duplicate ${operation.id}`
        );
        operationIds.add(operation.id);
        assert(
            ['public', 'authenticated', 'authorized'].includes(
                operation.access
            ),
            `${path}.access: unsupported`
        );
        assert(
            Array.isArray(operation.effects) && operation.effects.length > 0,
            `${path}.effects: non-empty array required`
        );
        assertKeys(
            operation.http,
            ['method', 'path', 'authentication', 'response_envelope'],
            `${path}.http`
        );

        for (const boundary of ['input', 'output']) {
            assertKeys(operation[boundary], ['fields'], `${path}.${boundary}`);
            assert(
                Array.isArray(operation[boundary].fields),
                `${path}.${boundary}.fields: array required`
            );
            const fieldNames = new Set();
            for (const [fieldIndex, field] of operation[
                boundary
            ].fields.entries()) {
                const fieldPath = `${path}.${boundary}.fields[${fieldIndex}]`;
                assertKeys(
                    field,
                    ['name', 'type', 'required', 'format', 'equals'],
                    fieldPath
                );
                assert(
                    !fieldNames.has(field.name),
                    `${fieldPath}.name: duplicate ${field.name}`
                );
                fieldNames.add(field.name);
                assert(
                    typeof field.required === 'boolean',
                    `${fieldPath}.required: boolean required`
                );
                assert(
                    field.type && typeof field.type.kind === 'string',
                    `${fieldPath}.type: required`
                );
                assertKeys(
                    field.type,
                    ['kind', 'name', 'nullable'],
                    `${fieldPath}.type`
                );
                assert(
                    ['primitive', 'model'].includes(field.type.kind),
                    `${fieldPath}.type.kind: unsupported ${field.type.kind}`
                );
                assert(
                    typeof field.type.name === 'string',
                    `${fieldPath}.type.name: required`
                );
                assert(
                    typeof field.type.nullable === 'boolean',
                    `${fieldPath}.type.nullable: boolean required`
                );
                if (field.format !== undefined) {
                    assert(
                        field.format === 'email',
                        `${fieldPath}.format: unsupported ${field.format}`
                    );
                }
                if (field.equals !== undefined) {
                    assert(
                        typeof field.equals === 'string' &&
                            field.equals.includes('.'),
                        `${fieldPath}.equals: qualified field target required`
                    );
                }
            }
        }
        assert(
            ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(
                operation.http.method
            ),
            `${path}.http.method: unsupported`
        );
        assert(
            typeof operation.http.path === 'string',
            `${path}.http.path: required`
        );
        assert(
            ['none', 'bearer', 'session', 'api_key', 'other'].includes(
                operation.http.authentication
            ),
            `${path}.http.authentication: unsupported`
        );
    }
    return observation;
}

/**
 * Calcule la liste des "evidence_refs" (traçabilité vers les faits/décisions
 * source) associés à un champ d'entrée. Chaque champ pointe toujours vers le
 * "fact" générique de son opération (`fact.<id>.input`), et en plus vers le
 * "constraint_fact" spécifique de la policy si le champ porte une contrainte
 * (required/format/equals) que ce fact ne couvre pas déjà. C'est le mécanisme
 * qui permet, plus tard, de remonter "pourquoi ce champ est requis" jusqu'à
 * la source humaine qui l'a décidé — indépendant de la provenance de
 * l'observation (legacy, spec structurée, ou futur OpenAPI).
 */
function evidenceRefsForInput(operationId, policyOperation, field) {
    const inputFact = `fact.${operationId}.input`;
    const refs = [inputFact];
    if (
        (field.required || field.format || field.equals) &&
        policyOperation.constraint_fact !== inputFact
    ) {
        refs.push(policyOperation.constraint_fact);
    }
    return refs;
}

/** Construit un identifiant stable de contrainte à partir d'un préfixe
 * (fourni par la policy, par opération), du nom du champ et du type de
 * contrainte (required/format/equals). Cas spécial : une contrainte "equals"
 * sur un champ de confirmation de mot de passe reçoit toujours l'id
 * `constraint.<prefix>-password-confirmation`, quel que soit le nom réel du
 * champ — convention figée du domaine authentication, pas générique. */
function constraintId(prefix, fieldName, kind) {
    const field = fieldName
        .replaceAll('_', '-')
        .replace('confirm-password', 'confirmation');
    if (kind === 'equals') return `constraint.${prefix}-password-confirmation`;
    const suffix = kind;
    return `constraint.${prefix}-${field}-${suffix}`;
}

export function buildSemanticModel(observation, policy) {
    validateObservation(observation);
    assert(
        observation.domain_id === policy.domain.id,
        'policy domain does not match observation'
    );

    const types = policy.opaque_types.map((type) => ({
        id: type.id,
        kind: 'opaque',
        description: type.description,
        fields: [],
        evidence_refs: [
            'fact.login.output',
            'decision.opaque-authentication-values',
        ],
    }));
    const constraints = [];
    const operations = [];
    const integrations = [];
    const emittedOutputTypes = new Map();

    for (const operation of observation.operations) {
        const metadata = policy.operations[operation.id];
        assert(metadata, `policy missing operation ${operation.id}`);
        const inputType = `${operation.id}-input`;
        const constraintFact = metadata.constraint_fact;
        types.push({
            id: inputType,
            kind: 'object',
            description: metadata.input_description,
            fields: operation.input.fields.map((field) => ({
                name: field.name,
                type: field.type,
                required: field.required,
                evidence_refs: evidenceRefsForInput(
                    operation.id,
                    metadata,
                    field
                ),
            })),
            evidence_refs: [
                ...new Set(
                    operation.input.fields.flatMap((field) =>
                        evidenceRefsForInput(operation.id, metadata, field)
                    )
                ),
            ],
        });

        const outputSignature = JSON.stringify(operation.output.fields);
        const previousSignature = emittedOutputTypes.get(metadata.output_type);
        assert(
            !previousSignature || previousSignature === outputSignature,
            `output type ${metadata.output_type} has conflicting shapes`
        );
        if (!previousSignature) {
            emittedOutputTypes.set(metadata.output_type, outputSignature);
            const outputEvidence = observation.operations
                .filter(
                    (candidate) =>
                        policy.operations[candidate.id].output_type ===
                        metadata.output_type
                )
                .map((candidate) => `fact.${candidate.id}.output`);
            types.push({
                id: metadata.output_type,
                kind: 'object',
                description: metadata.output_description,
                fields: operation.output.fields.map((field) => ({
                    name: field.name,
                    type: field.type,
                    required: field.required,
                    evidence_refs: outputEvidence,
                })),
                evidence_refs: outputEvidence,
            });
        }

        for (const field of operation.input.fields) {
            const target = `${inputType}.${field.name}`;
            if (field.required) {
                constraints.push({
                    id: constraintId(
                        metadata.constraint_prefix,
                        field.name,
                        'required'
                    ),
                    kind: 'required',
                    target,
                    parameters: {},
                    evidence_refs: [constraintFact],
                });
            }
            if (field.format) {
                constraints.push({
                    id: constraintId(
                        metadata.constraint_prefix,
                        field.name,
                        'format'
                    ),
                    kind: 'format',
                    target,
                    parameters: { format: field.format },
                    evidence_refs: [constraintFact],
                });
            }
            if (field.equals) {
                constraints.push({
                    id: constraintId(
                        metadata.constraint_prefix,
                        field.name,
                        'equals'
                    ),
                    kind: 'equals',
                    target,
                    parameters: { other_target: field.equals },
                    evidence_refs: [constraintFact],
                });
            }
        }

        const operationFact = `fact.${operation.id}.operation`;
        const effectFacts = {
            establish_session: 'fact.login.session-effect',
            external_call: operationFact,
            request_recovery: operationFact,
            reset_credential: operationFact,
        };
        const evidenceRefs = [
            'decision.command-classification',
            operationFact,
            `fact.${operation.id}.input`,
            `fact.${operation.id}.output`,
        ];
        if (operation.effects.includes('establish_session'))
            evidenceRefs.push('fact.login.session-effect');
        operations.push({
            id: operation.id,
            kind: 'command',
            description: metadata.description,
            input: { kind: 'model', name: inputType, nullable: false },
            output: {
                kind: 'model',
                name: metadata.output_type,
                nullable: false,
            },
            access: { mode: operation.access, evidence_refs: [operationFact] },
            effects: operation.effects.map((kind) => ({
                kind,
                description: metadata.effects[kind],
                evidence_refs: [effectFacts[kind]],
            })),
            integration_ref: `integration.${operation.id}`,
            evidence_refs: evidenceRefs,
        });
        integrations.push({
            id: `integration.${operation.id}`,
            kind: 'http',
            method: operation.http.method,
            path: operation.http.path,
            authentication: operation.http.authentication,
            response_envelope: operation.http.response_envelope ?? 'none',
            evidence_refs: [operationFact],
        });
    }

    return {
        schema_version: '1.0.0',
        model_id: 'authentication-action-request-semantic',
        domain: policy.domain,
        types,
        operations,
        constraints,
        integrations,
    };
}

export async function readJson(path) {
    return JSON.parse(await readFile(path, 'utf8'));
}
