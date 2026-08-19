import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { createEnvironmentInjector } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';

import { compileActionRequestDefinition } from './core/action-request-authoring.mjs';
import { assertPermissionRuntimeOracle } from './oracles/permission-runtime-oracle.mjs';
import { materializeGeneratedRuntime } from './oracles/runtime-harness.mjs';
import { generateActionRequest } from './generate-action-request.mjs';
import { computeTargetsForSemantic } from './render-targets.mjs';
import {
    loadJson,
    validateEvidence,
    validateJsonSchema,
    validateSemantic,
} from './validate-ir.mjs';

const definitionUrl = new URL(
    'sources/support-request.definition.json',
    import.meta.url
);
const schemaRoot = new URL('schemas/', import.meta.url);
let compiled;
let definition;
let targets;
let runtime;

before(async () => {
    const loaded = await Promise.all([
        loadJson(definitionUrl),
        loadJson(new URL('action-request-definition.schema.json', schemaRoot)),
        loadJson(new URL('evidence.schema.json', schemaRoot)),
        loadJson(new URL('semantic-model.schema.json', schemaRoot)),
    ]);
    [definition] = loaded;
    const [, definitionSchema, evidenceSchema, semanticSchema] = loaded;
    assert.deepEqual(
        validateJsonSchema(definition, definitionSchema),
        [],
        'support definition schema'
    );
    const content = await readFile(definitionUrl);
    compiled = compileActionRequestDefinition(definition, {
        sourceUri:
            'tools/generator-platform/sources/support-request.definition.json',
        sourceSha256: createHash('sha256').update(content).digest('hex'),
    });
    assert.deepEqual(
        await validateEvidence(compiled.evidence, evidenceSchema, {
            verifyHashes: false,
        }),
        [],
        'compiled evidence model'
    );
    assert.deepEqual(
        validateSemantic(compiled.semantic, semanticSchema, compiled.evidence),
        [],
        'compiled semantic model'
    );
    targets = await computeTargetsForSemantic(compiled.semantic);
    runtime = await materializeGeneratedRuntime(targets);
});

after(async () => {
    await runtime?.cleanup();
});

const input = {
    email: 'person@example.com',
    subject: 'Cannot open a report',
    message: 'The report remains unavailable.',
};
const result = {
    request_id: 'support-42',
    message: 'Request accepted',
};

test('authoring definition compiles into target-neutral evidence and semantic models', () => {
    assert.equal(compiled.semantic.model_id, 'support-action-request-semantic');
    assert.equal(compiled.semantic.operations[0].id, 'contact-support');
    assert.equal(compiled.semantic.operations[0].access.mode, 'authenticated');
    assert.equal(compiled.semantic.integrations[0].authentication, 'bearer');
    assert.doesNotMatch(
        JSON.stringify(compiled.semantic),
        /Angular|React|TypeScript|Nx/
    );
});

test('authoring compiler fails closed on contradictory or unsupported declarations', () => {
    const compile = (value) =>
        compileActionRequestDefinition(value, {
            sourceUri: 'invalid.definition.json',
            sourceSha256: '0'.repeat(64),
        });

    const anonymousAuthenticated = structuredClone(definition);
    anonymousAuthenticated.operations[0].http.authentication = 'none';
    assert.throws(
        () => compile(anonymousAuthenticated),
        /non-public access requires authentication/
    );

    const missingExternalCall = structuredClone(definition);
    missingExternalCall.operations[0].effects = [
        {
            kind: 'reset_credential',
            description: 'Unsupported as the only action-request effect.',
        },
    ];
    assert.throws(() => compile(missingExternalCall), /requires external_call/);

    const constrainedOutput = structuredClone(definition);
    constrainedOutput.operations[0].output.fields[0].format = 'email';
    assert.throws(
        () => compile(constrainedOutput),
        /output constraints are unsupported/
    );

    const authorizedWithoutPermission = structuredClone(definition);
    authorizedWithoutPermission.operations[0].access = {
        mode: 'authorized',
    };
    assert.throws(
        () => compile(authorizedWithoutPermission),
        /authorized access requires permissions/
    );

    const permissionsWithoutAuthorization = structuredClone(definition);
    permissionsWithoutAuthorization.operations[0].access.permissions = [
        'support.submit',
    ];
    assert.throws(
        () => compile(permissionsWithoutAuthorization),
        /only authorized access may declare permissions/
    );

    const duplicatePermissions = structuredClone(definition);
    duplicatePermissions.operations[0].access = {
        mode: 'authorized',
        permissions: ['support.submit', 'support.submit'],
    };
    assert.throws(
        () => compile(duplicatePermissions),
        /duplicate permissions are forbidden/
    );
});

test('generic profiles expand for support without authentication naming leakage', () => {
    const angularProject = JSON.parse(targets.angular.files['project.json']);
    const reactPackage = JSON.parse(targets.react.files['package.json']);
    assert.equal(angularProject.name, 'generated-support-angular');
    assert.equal(
        angularProject.sourceRoot,
        'libs/generated/support-angular/src'
    );
    assert.equal(reactPackage.name, 'generated-support-react');
    assert.deepEqual(
        Object.keys(targets.angular.files).filter((path) =>
            path.includes('action-request')
        ),
        ['src/action-request-client.ts', 'src/action-request-commands.ts']
    );
    assert.doesNotMatch(
        Object.values(targets.angular.files).join('\n'),
        /AuthenticationClient|AuthenticationCommands/
    );
    assert.doesNotMatch(
        Object.values(targets.react.files).join('\n'),
        /AuthenticationClient|createAuthenticationHooks/
    );
    assert.doesNotMatch(
        targets.react.files['src/use-action-request-commands.ts'],
        /SessionPort|session:/
    );
});

test('Angular executes the generated authenticated support request without a session port', async () => {
    const requests = [];
    const http = {
        post(url, body, options) {
            requests.push({
                url,
                body,
                public: options.context.get(
                    runtime.angular.client.PUBLIC_REQUEST
                ),
            });
            return of(result);
        },
    };
    assert.equal(runtime.angular.commands.SESSION_PORT, undefined);
    const injector = createEnvironmentInjector(
        [
            { provide: HttpClient, useValue: http },
            {
                provide: runtime.angular.client.ACTION_REQUEST_BASE_URL,
                useValue: 'https://api.example.test/',
            },
            runtime.angular.client.ActionRequestClient,
            runtime.angular.commands.ActionRequestCommands,
        ],
        null
    );
    try {
        const commands = injector.get(
            runtime.angular.commands.ActionRequestCommands
        );
        assert.deepEqual(
            await firstValueFrom(commands.contactSupport(input)),
            result
        );
        assert.deepEqual(requests, [
            {
                url: 'https://api.example.test/support/requests',
                body: input,
                public: false,
            },
        ]);
        assert.deepEqual(
            runtime.angular.validation.validateContactSupportInput({
                ...input,
                email: 'invalid',
            }),
            [{ field: 'email', rule: 'format:email' }]
        );
    } finally {
        injector.destroy();
    }
});

test('ReactJS executes the generated support hook with bearer metadata', async () => {
    const requests = [];
    const client = new runtime.react.client.ActionRequestClient(
        'https://api.example.test/',
        async (url, init) => {
            requests.push({
                url,
                method: init.method,
                authentication: init.authentication,
                body: JSON.parse(init.body),
            });
            return { ok: true, status: 200, json: async () => result };
        }
    );
    const transitions = [];
    const hooks = runtime.react.hooks.createActionRequestHooks(
        {
            useState(initial) {
                return [initial, (value) => transitions.push(value)];
            },
            useCallback(callback) {
                return callback;
            },
        },
        client
    );
    assert.deepEqual(await hooks.useContactSupport().execute(input), result);
    assert.deepEqual(requests, [
        {
            url: 'https://api.example.test/support/requests',
            method: 'POST',
            authentication: 'bearer',
            body: input,
        },
    ]);
    assert.deepEqual(
        transitions.map(({ status }) => status),
        ['pending', 'success']
    );
});

test('authorized support requires every canonical permission before either target calls its transport', async () => {
    const authorizedDefinition = structuredClone(definition);
    authorizedDefinition.operations[0].access = {
        mode: 'authorized',
        permissions: ['support.submit', 'support.audit'],
    };
    const authorized = compileActionRequestDefinition(authorizedDefinition, {
        sourceUri: 'authorized-support.definition.json',
        sourceSha256: '0'.repeat(64),
    });
    const authorizedTargets = await computeTargetsForSemantic(
        authorized.semantic
    );
    const authorizedRuntime =
        await materializeGeneratedRuntime(authorizedTargets);
    try {
        await assertPermissionRuntimeOracle(authorizedRuntime, {
            permissions: ['support.submit', 'support.audit'],
            input,
            result,
            angularMethod: 'contactSupport',
            reactHook: 'useContactSupport',
        });
    } finally {
        await authorizedRuntime.cleanup();
    }
});

test('CLI pipeline writes verified Angular and ReactJS packages and refuses overwrite', async () => {
    const temporaryRoot = await mkdtemp(
        resolve(tmpdir(), 'cmz-action-request-authoring-')
    );
    const outputRoot = resolve(temporaryRoot, 'generated-support');
    try {
        const generated = await generateActionRequest({
            definitionPath: fileURLToPath(definitionUrl),
            outputRoot,
            target: 'all',
        });
        assert.deepEqual(generated.targets, ['angular', 'reactjs']);
        assert.equal(generated.publication.status, 'created');
        assert.equal(generated.publication.recovery_pending, undefined);
        const [semantic, artifactPlan, angularManifest, reactManifest] =
            await Promise.all([
                loadJson(resolve(outputRoot, 'semantic-model.json')),
                loadJson(resolve(outputRoot, 'artifact-plan.json')),
                loadJson(
                    resolve(outputRoot, 'angular/generation-manifest.json')
                ),
                loadJson(
                    resolve(outputRoot, 'reactjs/generation-manifest.json')
                ),
                readFile(
                    resolve(outputRoot, 'angular/src/action-request-client.ts')
                ),
                readFile(
                    resolve(outputRoot, 'reactjs/src/action-request-client.ts')
                ),
            ]);
        assert.equal(semantic.model_id, 'support-action-request-semantic');
        assert.equal(artifactPlan.input.model_id, semantic.model_id);
        assert.equal(angularManifest.plan.sha256, reactManifest.plan.sha256);
        assert.equal(angularManifest.input.sha256, reactManifest.input.sha256);
        await assert.rejects(
            generateActionRequest({
                definitionPath: fileURLToPath(definitionUrl),
                outputRoot,
                target: 'all',
            }),
            /output already exists/
        );
    } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
    }
});
