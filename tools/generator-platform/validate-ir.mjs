import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(moduleDirectory, '../..');

const defaultPaths = {
    evidence: resolve(moduleDirectory, 'fixtures/action-request.evidence.json'),
    evidenceSchema: resolve(moduleDirectory, 'schemas/evidence.schema.json'),
    semantic: resolve(moduleDirectory, 'fixtures/action-request.semantic.json'),
    semanticSchema: resolve(
        moduleDirectory,
        'schemas/semantic-model.schema.json'
    ),
};

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

const forbiddenSemanticTokens = [
    /\bangular\b/i,
    /\bfigma\b/i,
    /\bnx\b/i,
    /\breact\b/i,
    /\bseos\b/i,
    /\btypescript\b/i,
    /(?:^|["\s])(apps|libs|src)\//i,
    /\.(?:ts|tsx|jsx|html|scss)(?:["\s]|$)/i,
];

function describe(value) {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    return typeof value;
}

function schemaTypeMatches(value, expected) {
    if (expected === 'array') return Array.isArray(value);
    if (expected === 'object') {
        return (
            value !== null && typeof value === 'object' && !Array.isArray(value)
        );
    }
    if (expected === 'integer') return Number.isInteger(value);
    return typeof value === expected;
}

function resolveLocalReference(reference, rootSchema) {
    if (!reference.startsWith('#/')) {
        throw new Error(`unsupported non-local schema reference: ${reference}`);
    }

    return reference
        .slice(2)
        .split('/')
        .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
        .reduce((current, token) => current?.[token], rootSchema);
}

export function validateJsonSchema(
    value,
    schema,
    rootSchema = schema,
    path = '$'
) {
    const errors = [];
    let currentSchema = schema;

    if (currentSchema.$ref) {
        currentSchema = resolveLocalReference(currentSchema.$ref, rootSchema);
        if (!currentSchema) {
            return [`${path}: unresolved schema reference ${schema.$ref}`];
        }
    }

    if (
        Object.hasOwn(currentSchema, 'const') &&
        JSON.stringify(value) !== JSON.stringify(currentSchema.const)
    ) {
        errors.push(
            `${path}: expected constant ${JSON.stringify(currentSchema.const)}`
        );
    }

    if (
        currentSchema.enum &&
        !currentSchema.enum.some(
            (candidate) => JSON.stringify(candidate) === JSON.stringify(value)
        )
    ) {
        errors.push(
            `${path}: expected one of ${currentSchema.enum.join(', ')}`
        );
    }

    if (currentSchema.type && !schemaTypeMatches(value, currentSchema.type)) {
        errors.push(
            `${path}: expected ${currentSchema.type}, received ${describe(value)}`
        );
        return errors;
    }

    if (typeof value === 'number') {
        if (
            currentSchema.minimum !== undefined &&
            value < currentSchema.minimum
        ) {
            errors.push(`${path}: must be >= ${currentSchema.minimum}`);
        }
        if (
            currentSchema.maximum !== undefined &&
            value > currentSchema.maximum
        ) {
            errors.push(`${path}: must be <= ${currentSchema.maximum}`);
        }
    }

    if (typeof value === 'string') {
        if (
            currentSchema.minLength !== undefined &&
            value.length < currentSchema.minLength
        ) {
            errors.push(
                `${path}: must contain at least ${currentSchema.minLength} chars`
            );
        }
        if (
            currentSchema.pattern &&
            !new RegExp(currentSchema.pattern).test(value)
        ) {
            errors.push(`${path}: does not match ${currentSchema.pattern}`);
        }
    }

    if (Array.isArray(value)) {
        if (
            currentSchema.minItems !== undefined &&
            value.length < currentSchema.minItems
        ) {
            errors.push(
                `${path}: must contain at least ${currentSchema.minItems} items`
            );
        }
        if (currentSchema.items) {
            value.forEach((item, index) => {
                errors.push(
                    ...validateJsonSchema(
                        item,
                        currentSchema.items,
                        rootSchema,
                        `${path}[${index}]`
                    )
                );
            });
        }
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        for (const key of currentSchema.required ?? []) {
            if (!Object.hasOwn(value, key))
                errors.push(`${path}.${key}: is required`);
        }

        for (const [key, child] of Object.entries(value)) {
            const propertySchema = currentSchema.properties?.[key];
            if (!propertySchema) {
                if (currentSchema.additionalProperties === false) {
                    errors.push(
                        `${path}.${key}: additional property is not allowed`
                    );
                }
                continue;
            }
            errors.push(
                ...validateJsonSchema(
                    child,
                    propertySchema,
                    rootSchema,
                    `${path}.${key}`
                )
            );
        }
    }

    return errors;
}

function duplicateIdErrors(groups, label) {
    const seen = new Map();
    const errors = [];

    for (const [groupName, entries] of Object.entries(groups)) {
        for (const entry of entries) {
            if (seen.has(entry.id)) {
                errors.push(
                    `${label}: duplicate id ${entry.id} in ${groupName}; already declared in ${seen.get(entry.id)}`
                );
            } else {
                seen.set(entry.id, groupName);
            }
        }
    }
    return errors;
}

function unresolvedReferenceErrors(entries, allowedIds, label) {
    const errors = [];
    for (const [entryPath, references] of entries) {
        for (const reference of references) {
            if (!allowedIds.has(reference)) {
                errors.push(`${entryPath}: unresolved ${label} ${reference}`);
            }
        }
    }
    return errors;
}

async function validateSourceHashes(evidence, rootDirectory) {
    const errors = [];

    for (const source of evidence.sources) {
        const absolutePath = resolve(rootDirectory, source.uri);
        if (!absolutePath.startsWith(`${resolve(rootDirectory)}/`)) {
            errors.push(`source ${source.id}: uri escapes repository root`);
            continue;
        }

        try {
            const content = await readFile(absolutePath);
            const actualHash = createHash('sha256')
                .update(content)
                .digest('hex');
            if (actualHash !== source.sha256) {
                errors.push(
                    `source ${source.id}: stale sha256 for ${source.uri}; expected ${source.sha256}, received ${actualHash}`
                );
            }
        } catch (error) {
            errors.push(
                `source ${source.id}: cannot read ${source.uri}: ${error.message}`
            );
        }
    }

    return errors;
}

export async function validateEvidence(
    evidence,
    schema,
    { rootDirectory = repositoryRoot, verifyHashes = true } = {}
) {
    const errors = validateJsonSchema(evidence, schema);
    errors.push(
        ...duplicateIdErrors(
            {
                sources: evidence.sources ?? [],
                facts: evidence.facts ?? [],
                unknowns: evidence.unknowns ?? [],
                decisions: evidence.decisions ?? [],
            },
            'evidence model'
        )
    );

    const sourceIds = new Set((evidence.sources ?? []).map(({ id }) => id));
    const factIds = new Set((evidence.facts ?? []).map(({ id }) => id));
    const unknownIds = new Set((evidence.unknowns ?? []).map(({ id }) => id));

    errors.push(
        ...unresolvedReferenceErrors(
            (evidence.facts ?? []).map((fact) => [
                `fact ${fact.id}.evidence_refs`,
                fact.evidence_refs ?? [],
            ]),
            sourceIds,
            'source reference'
        ),
        ...unresolvedReferenceErrors(
            (evidence.unknowns ?? []).map((unknown) => [
                `unknown ${unknown.id}.evidence_refs`,
                unknown.evidence_refs ?? [],
            ]),
            new Set([...sourceIds, ...factIds]),
            'evidence reference'
        ),
        ...unresolvedReferenceErrors(
            (evidence.decisions ?? []).map((decision) => [
                `decision ${decision.id}.evidence_refs`,
                decision.evidence_refs ?? [],
            ]),
            new Set([...sourceIds, ...factIds, ...unknownIds]),
            'evidence reference'
        )
    );

    if (verifyHashes) {
        errors.push(...(await validateSourceHashes(evidence, rootDirectory)));
    }

    return errors;
}

function visitEvidenceReferences(value, path = '$', found = []) {
    if (Array.isArray(value)) {
        value.forEach((item, index) =>
            visitEvidenceReferences(item, `${path}[${index}]`, found)
        );
    } else if (value !== null && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            if (key === 'evidence_refs' && Array.isArray(child)) {
                found.push([`${path}.${key}`, child]);
            } else {
                visitEvidenceReferences(child, `${path}.${key}`, found);
            }
        }
    }
    return found;
}

function validateTypeReference(reference, path, typeIds, errors) {
    if (!reference || typeof reference !== 'object') return;

    const allowedKeysByKind = {
        primitive: new Set(['kind', 'name', 'nullable']),
        model: new Set(['kind', 'name', 'nullable']),
        list: new Set(['kind', 'items', 'nullable']),
        map: new Set(['kind', 'values', 'nullable']),
    };
    const allowedKeys = allowedKeysByKind[reference.kind];
    if (!allowedKeys) return;

    for (const key of Object.keys(reference)) {
        if (!allowedKeys.has(key)) {
            errors.push(
                `${path}.${key}: invalid for ${reference.kind} type reference`
            );
        }
    }

    if (reference.kind === 'primitive' && !primitiveNames.has(reference.name)) {
        errors.push(`${path}.name: unknown primitive ${reference.name}`);
    }
    if (reference.kind === 'model' && !typeIds.has(reference.name)) {
        errors.push(`${path}.name: unresolved model type ${reference.name}`);
    }
    if (reference.kind === 'list') {
        if (!reference.items)
            errors.push(`${path}.items: is required for list`);
        validateTypeReference(
            reference.items,
            `${path}.items`,
            typeIds,
            errors
        );
    }
    if (reference.kind === 'map') {
        if (!reference.values)
            errors.push(`${path}.values: is required for map`);
        validateTypeReference(
            reference.values,
            `${path}.values`,
            typeIds,
            errors
        );
    }
}

export function validateSemantic(semantic, schema, evidence) {
    const errors = validateJsonSchema(semantic, schema);
    errors.push(
        ...duplicateIdErrors(
            {
                types: semantic.types ?? [],
                operations: semantic.operations ?? [],
                constraints: semantic.constraints ?? [],
                integrations: semantic.integrations ?? [],
            },
            'semantic model'
        )
    );

    const evidenceIds = new Set([
        ...(evidence.facts ?? []).map(({ id }) => id),
        ...(evidence.decisions ?? []).map(({ id }) => id),
    ]);
    errors.push(
        ...unresolvedReferenceErrors(
            visitEvidenceReferences(semantic),
            evidenceIds,
            'evidence reference'
        )
    );

    const typeIds = new Set((semantic.types ?? []).map(({ id }) => id));
    for (const [typeIndex, type] of (semantic.types ?? []).entries()) {
        if (type.kind === 'object' && type.fields.length === 0) {
            errors.push(
                `$.types[${typeIndex}].fields: object type must declare fields`
            );
        }
        if (type.kind !== 'object' && type.fields.length !== 0) {
            errors.push(
                `$.types[${typeIndex}].fields: ${type.kind} type must be fieldless`
            );
        }

        const fieldNames = new Set();
        for (const [fieldIndex, field] of type.fields.entries()) {
            if (fieldNames.has(field.name)) {
                errors.push(`type ${type.id}: duplicate field ${field.name}`);
            }
            fieldNames.add(field.name);
            validateTypeReference(
                field.type,
                `$.types[${typeIndex}].fields[${fieldIndex}].type`,
                typeIds,
                errors
            );
        }
    }

    const integrationsById = new Map(
        (semantic.integrations ?? []).map((integration) => [
            integration.id,
            integration,
        ])
    );
    for (const [index, operation] of (semantic.operations ?? []).entries()) {
        validateTypeReference(
            operation.input,
            `$.operations[${index}].input`,
            typeIds,
            errors
        );
        validateTypeReference(
            operation.output,
            `$.operations[${index}].output`,
            typeIds,
            errors
        );
        const integration = integrationsById.get(operation.integration_ref);
        if (!integration) {
            errors.push(
                `operation ${operation.id}: unresolved integration ${operation.integration_ref}`
            );
        }
        if (
            operation.access?.mode === 'authorized' &&
            !operation.access.permissions?.length
        ) {
            errors.push(
                `operation ${operation.id}: authorized access needs permissions`
            );
        }
        if (
            integration &&
            operation.access?.mode === 'public' &&
            integration.authentication !== 'none'
        ) {
            errors.push(
                `operation ${operation.id}: public access requires unauthenticated integration`
            );
        }
        if (
            integration &&
            ['authenticated', 'authorized'].includes(operation.access?.mode) &&
            integration.authentication === 'none'
        ) {
            errors.push(
                `operation ${operation.id}: ${operation.access.mode} access requires authenticated integration`
            );
        }
    }

    const fieldTargets = new Map();
    for (const type of semantic.types ?? []) {
        for (const field of type.fields) {
            fieldTargets.set(`${type.id}.${field.name}`, field);
        }
    }
    for (const constraint of semantic.constraints ?? []) {
        const field = fieldTargets.get(constraint.target);
        if (!field) {
            errors.push(
                `constraint ${constraint.id}: unresolved target ${constraint.target}`
            );
            continue;
        }
        if (constraint.kind === 'required' && !field.required) {
            errors.push(
                `constraint ${constraint.id}: target ${constraint.target} is not marked required`
            );
        }
        if (
            constraint.kind === 'format' &&
            typeof constraint.parameters.format !== 'string'
        ) {
            errors.push(
                `constraint ${constraint.id}: format parameter is required`
            );
        }
        if (constraint.kind === 'equals') {
            const otherTarget = constraint.parameters.other_target;
            if (
                typeof otherTarget !== 'string' ||
                !fieldTargets.has(otherTarget)
            ) {
                errors.push(
                    `constraint ${constraint.id}: unresolved other_target ${otherTarget}`
                );
            }
        }
    }

    const serialized = JSON.stringify(semantic);
    for (const forbidden of forbiddenSemanticTokens) {
        if (forbidden.test(serialized)) {
            errors.push(
                `semantic model: target-specific leakage matches ${forbidden}`
            );
        }
    }

    return errors;
}

export async function loadJson(path) {
    return JSON.parse(await readFile(path, 'utf8'));
}

export async function validateFiles(paths = defaultPaths) {
    const [evidence, evidenceSchema, semantic, semanticSchema] =
        await Promise.all([
            loadJson(paths.evidence),
            loadJson(paths.evidenceSchema),
            loadJson(paths.semantic),
            loadJson(paths.semanticSchema),
        ]);
    const evidenceErrors = await validateEvidence(evidence, evidenceSchema);
    const semanticErrors = validateSemantic(semantic, semanticSchema, evidence);
    return { evidenceErrors, semanticErrors };
}

async function main() {
    const result = await validateFiles();
    const errors = [
        ...result.evidenceErrors.map((error) => `Evidence: ${error}`),
        ...result.semanticErrors.map((error) => `Semantic: ${error}`),
    ];

    if (errors.length > 0) {
        console.error(
            `Generator platform IR validation failed (${errors.length}):`
        );
        errors.forEach((error) => console.error(`- ${error}`));
        process.exitCode = 1;
        return;
    }

    console.log('Generator platform IR validation: OK');
    console.log('  Evidence sources: verified with SHA-256 provenance');
    console.log(
        '  Semantic model: schema-valid, referentially closed, target-neutral'
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await main();
}
