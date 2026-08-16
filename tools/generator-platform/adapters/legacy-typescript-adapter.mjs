import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import ts from 'typescript';

import {
    canonicalName,
    validateObservation,
} from '../core/action-request-model.mjs';

const operations = [
    {
        id: 'login',
        contract:
            'libs/authentication/domain/src/lib/contracts/login-request.contract.ts',
        contractInterface: 'LoginRequestContract',
        validator:
            'libs/authentication/domain/src/lib/validators/login-request.validator.ts',
        props: 'libs/authentication/domain/src/lib/props/login.props.ts',
        propsInterface: 'LoginProps',
        api: 'libs/authentication/data/src/lib/sources/login.api.ts',
        facade: 'libs/authentication/application/src/lib/facades/login.facade.ts',
        endpointKey: 'LOGIN',
    },
    {
        id: 'forgot-password',
        contract:
            'libs/authentication/domain/src/lib/contracts/forgot-password-request.contract.ts',
        contractInterface: 'ForgotPasswordRequestContract',
        validator:
            'libs/authentication/domain/src/lib/validators/forgot-password-request.validator.ts',
        props: 'libs/authentication/domain/src/lib/props/forgot-password.props.ts',
        propsInterface: 'ForgotPasswordProps',
        api: 'libs/authentication/data/src/lib/sources/forgot-password.api.ts',
        endpointKey: 'FORGOT_PASSWORD',
    },
    {
        id: 'reset-password',
        contract:
            'libs/authentication/domain/src/lib/contracts/reset-password-request.contract.ts',
        contractInterface: 'ResetPasswordRequestContract',
        validator:
            'libs/authentication/domain/src/lib/validators/reset-password-request.validator.ts',
        props: 'libs/authentication/domain/src/lib/props/reset-password.props.ts',
        propsInterface: 'ResetPasswordProps',
        api: 'libs/authentication/data/src/lib/sources/reset-password.api.ts',
        endpointKey: 'RESET_PASSWORD',
    },
];

const endpointsPath =
    'libs/authentication/data/src/lib/endpoints/authentication.endpoints.ts';

function parseSource(text, path) {
    return ts.createSourceFile(
        path,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
    );
}

function visit(node, predicate) {
    if (predicate(node)) return node;
    let found;
    ts.forEachChild(node, (child) => {
        if (!found) found = visit(child, predicate);
    });
    return found;
}

function contractField(node) {
    return visit(node, (candidate) => {
        if (!ts.isPropertyAccessExpression(candidate)) return false;
        return (
            ts.isIdentifier(candidate.expression) &&
            candidate.expression.text === 'contract'
        );
    })?.name.text;
}

function typeReference(typeText, path) {
    if (typeText === 'string') {
        return { kind: 'primitive', name: 'string', nullable: false };
    }
    const models = {
        AuthToken: 'authentication-token',
        CurrentUser: 'current-user',
    };
    if (models[typeText]) {
        return { kind: 'model', name: models[typeText], nullable: false };
    }
    throw new Error(`${path}: unsupported TypeScript type ${typeText}`);
}

function extractInterface(source, interfaceName, path) {
    const declaration = source.statements.find(
        (statement) =>
            ts.isInterfaceDeclaration(statement) &&
            statement.name.text === interfaceName
    );
    if (!declaration)
        throw new Error(`${path}: interface ${interfaceName} not found`);

    return declaration.members.map((member) => {
        if (!ts.isPropertySignature(member) || !member.type || !member.name) {
            throw new Error(`${path}: unsupported interface member`);
        }
        const sourceName = member.name.getText(source);
        return {
            name: canonicalName(sourceName),
            type: typeReference(member.type.getText(source), path),
            required: !member.questionToken,
            sourceName,
        };
    });
}

function findCall(node, name) {
    return visit(
        node,
        (candidate) =>
            ts.isCallExpression(candidate) &&
            ((ts.isIdentifier(candidate.expression) &&
                candidate.expression.text === name) ||
                (ts.isPropertyAccessExpression(candidate.expression) &&
                    candidate.expression.name.text === name))
    );
}

function applyValidator(source, fields, operationId, path) {
    const bySourceName = new Map(
        fields.map((field) => [field.sourceName, field])
    );
    const ifStatements = [];
    const collect = (node) => {
        if (ts.isIfStatement(node)) ifStatements.push(node);
        ts.forEachChild(node, collect);
    };
    collect(source);

    for (const statement of ifStatements) {
        const validEmail = findCall(statement.expression, 'isValidEmail');
        const matchPassword = findCall(
            statement.expression,
            'isMatchConfirmPassword'
        );
        if (validEmail) {
            const name = contractField(validEmail.arguments[0]);
            const field = bySourceName.get(name);
            if (!field)
                throw new Error(
                    `${path}: email validator references unknown field ${name}`
                );
            field.format = 'email';
            continue;
        }
        if (matchPassword) {
            const left = contractField(matchPassword.arguments[0]);
            const right = contractField(matchPassword.arguments[1]);
            const field = bySourceName.get(right);
            if (!left || !field)
                throw new Error(
                    `${path}: password match arguments are unsupported`
                );
            field.equals = `${operationId}-input.${canonicalName(left)}`;
            continue;
        }
        if (
            !ts.isPrefixUnaryExpression(statement.expression) ||
            statement.expression.operator !== ts.SyntaxKind.ExclamationToken
        ) {
            throw new Error(
                `${path}: unsupported validation branch ${statement.expression.getText(source)}`
            );
        }
        const name = contractField(statement.expression);
        const field = bySourceName.get(name);
        if (!field)
            throw new Error(
                `${path}: unsupported validation branch ${statement.expression.getText(source)}`
            );
        field.required = true;
    }

    return fields.map((entry) => {
        const { sourceName, ...field } = entry;
        void sourceName;
        return field;
    });
}

export const legacyAdapterInternals = {
    applyValidator,
    extractInterface,
    parseSource,
};

function extractEndpoints(source, path) {
    const declaration = source.statements.find(
        (statement) =>
            ts.isVariableStatement(statement) &&
            statement.declarationList.declarations.some(
                (item) =>
                    ts.isIdentifier(item.name) &&
                    item.name.text === 'AUTHENTICATION_ENDPOINTS'
            )
    );
    const variable = declaration?.declarationList.declarations.find(
        (item) =>
            ts.isIdentifier(item.name) &&
            item.name.text === 'AUTHENTICATION_ENDPOINTS'
    );
    let initializer = variable?.initializer;
    if (initializer && ts.isAsExpression(initializer))
        initializer = initializer.expression;
    if (!initializer || !ts.isObjectLiteralExpression(initializer)) {
        throw new Error(`${path}: AUTHENTICATION_ENDPOINTS object not found`);
    }
    return Object.fromEntries(
        initializer.properties.map((property) => {
            if (
                !ts.isPropertyAssignment(property) ||
                !ts.isStringLiteral(property.initializer)
            ) {
                throw new Error(`${path}: unsupported endpoint declaration`);
            }
            return [property.name.getText(source), property.initializer.text];
        })
    );
}

function extractHttp(source, endpointKey, endpoints, path) {
    const call = visit(source, (candidate) => {
        if (
            !ts.isCallExpression(candidate) ||
            !ts.isPropertyAccessExpression(candidate.expression)
        )
            return false;
        return candidate.expression.expression.getText(source) === 'this.http';
    });
    if (!call || !ts.isPropertyAccessExpression(call.expression)) {
        throw new Error(`${path}: this.http call not found`);
    }
    const endpointReference = visit(
        source,
        (candidate) =>
            ts.isPropertyAccessExpression(candidate) &&
            candidate.expression.getText(source) === 'AUTHENTICATION_ENDPOINTS'
    );
    if (endpointReference?.name.text !== endpointKey) {
        throw new Error(
            `${path}: expected endpoint ${endpointKey}, received ${endpointReference?.name.text}`
        );
    }
    const publicAccess = source.getText().includes('.set(SKIP_AUTH, true)');
    if (!publicAccess)
        throw new Error(
            `${path}: authentication mode is not explicitly supported`
        );
    return {
        method: call.expression.name.text.toUpperCase(),
        path: endpoints[endpointKey],
        authentication: 'none',
    };
}

function classifyEffects(operationId, facadeSource) {
    const effects = ['external_call'];
    if (operationId === 'login') {
        if (!facadeSource || !findCall(facadeSource, 'save')) {
            throw new Error('login facade: session save effect not found');
        }
        effects.push('establish_session');
    } else if (operationId === 'forgot-password') {
        effects.push('request_recovery');
    } else if (operationId === 'reset-password') {
        effects.push('reset_credential');
    } else {
        throw new Error(
            `unsupported action-request effect classification: ${operationId}`
        );
    }
    return effects;
}

async function loadSource(rootDirectory, uri, id) {
    const content = await readFile(resolve(rootDirectory, uri));
    return {
        content: content.toString('utf8'),
        descriptor: {
            id,
            kind: 'source_code',
            uri,
            sha256: createHash('sha256').update(content).digest('hex'),
        },
    };
}

export async function adaptLegacyTypescript(rootDirectory) {
    const endpointFile = await loadSource(
        rootDirectory,
        endpointsPath,
        'source.authentication-endpoints'
    );
    const endpoints = extractEndpoints(
        parseSource(endpointFile.content, endpointsPath),
        endpointsPath
    );
    const sources = [];
    const normalizedOperations = [];

    for (const operation of operations) {
        const prefix = operation.id;
        const [contract, validator, props, api, facade] = await Promise.all([
            loadSource(
                rootDirectory,
                operation.contract,
                `source.${prefix}-contract`
            ),
            loadSource(
                rootDirectory,
                operation.validator,
                `source.${prefix}-validator`
            ),
            loadSource(
                rootDirectory,
                operation.props,
                `source.${prefix}-props`
            ),
            loadSource(rootDirectory, operation.api, `source.${prefix}-api`),
            operation.facade
                ? loadSource(
                      rootDirectory,
                      operation.facade,
                      `source.${prefix}-facade`
                  )
                : undefined,
        ]);
        const inputFields = extractInterface(
            parseSource(contract.content, operation.contract),
            operation.contractInterface,
            operation.contract
        );
        const outputFields = extractInterface(
            parseSource(props.content, operation.props),
            operation.propsInterface,
            operation.props
        ).map((entry) => {
            const { sourceName, ...field } = entry;
            void sourceName;
            return field;
        });
        const validatorSource = parseSource(
            validator.content,
            operation.validator
        );
        const apiSource = parseSource(api.content, operation.api);
        const facadeSource = facade
            ? parseSource(facade.content, operation.facade)
            : undefined;

        normalizedOperations.push({
            id: operation.id,
            input: {
                fields: applyValidator(
                    validatorSource,
                    inputFields,
                    operation.id,
                    operation.validator
                ),
            },
            output: { fields: outputFields },
            access: 'public',
            http: extractHttp(
                apiSource,
                operation.endpointKey,
                endpoints,
                operation.api
            ),
            effects: classifyEffects(operation.id, facadeSource),
        });
        sources.push(
            contract.descriptor,
            validator.descriptor,
            props.descriptor,
            api.descriptor
        );
        if (facade) sources.push(facade.descriptor);
    }
    sources.push(endpointFile.descriptor);

    return {
        observation: validateObservation({
            schema_version: '1.0.0',
            domain_id: 'authentication',
            operations: normalizedOperations,
        }),
        sources,
    };
}
