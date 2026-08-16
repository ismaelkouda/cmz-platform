import assert from 'node:assert/strict';

import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { createEnvironmentInjector } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';

function reactHooksPort(transitions) {
    return {
        useState(initial) {
            return [initial, (value) => transitions.push(value)];
        },
        useCallback(callback) {
            return callback;
        },
    };
}

function assertPermissionError(error, ErrorType, missingPermissions, target) {
    assert.ok(error instanceof ErrorType, `${target}: stable error type`);
    assert.equal(error.code, 'permission_denied', `${target}: stable code`);
    assert.deepEqual(
        error.missingPermissions,
        missingPermissions,
        `${target}: exact missing permissions`
    );
}

export async function assertPermissionRuntimeOracle(
    runtime,
    {
        permissions,
        input,
        result,
        angularMethod,
        reactHook,
        baseUrl = 'https://api.example.test/',
    }
) {
    assert.ok(permissions.length > 0, 'Oracle: permissions are required');
    const deniedPermissions = new Set(permissions.slice(0, -1));
    const expectedMissing = permissions.slice(-1);
    assert.ok(
        runtime.angular.commands.PERMISSION_PORT,
        'Angular: permission DI token must be exported'
    );
    assert.ok(
        runtime.angular.commands.PermissionDeniedError,
        'Angular: permission error must be exported'
    );
    assert.ok(
        runtime.react.hooks.PermissionDeniedError,
        'ReactJS: permission error must be exported'
    );

    const createAngular = (granted) => {
        const requests = [];
        const checked = [];
        const injector = createEnvironmentInjector(
            [
                {
                    provide: HttpClient,
                    useValue: {
                        post(url, body) {
                            requests.push({ url, body });
                            return of(result);
                        },
                    },
                },
                {
                    provide: runtime.angular.client.ACTION_REQUEST_BASE_URL,
                    useValue: baseUrl,
                },
                {
                    provide: runtime.angular.commands.PERMISSION_PORT,
                    useValue: {
                        has(candidate) {
                            checked.push(candidate);
                            return granted.has(candidate);
                        },
                    },
                },
                runtime.angular.client.ActionRequestClient,
                runtime.angular.commands.ActionRequestCommands,
            ],
            null
        );
        return {
            checked,
            commands: injector.get(
                runtime.angular.commands.ActionRequestCommands
            ),
            destroy: () => injector.destroy(),
            requests,
        };
    };

    const deniedAngular = createAngular(deniedPermissions);
    try {
        let failure;
        try {
            await firstValueFrom(deniedAngular.commands[angularMethod](input));
        } catch (error) {
            failure = error;
        }
        assertPermissionError(
            failure,
            runtime.angular.commands.PermissionDeniedError,
            expectedMissing,
            'Angular'
        );
        assert.deepEqual(
            deniedAngular.checked,
            permissions,
            'Angular: every declared permission must be evaluated'
        );
        assert.deepEqual(
            deniedAngular.requests,
            [],
            'Angular: denied command must not reach HTTP'
        );
    } finally {
        deniedAngular.destroy();
    }

    const allowedAngular = createAngular(new Set(permissions));
    try {
        assert.deepEqual(
            await firstValueFrom(allowedAngular.commands[angularMethod](input)),
            result,
            'Angular: granted command result'
        );
        assert.equal(
            allowedAngular.requests.length,
            1,
            'Angular: granted command reaches HTTP exactly once'
        );
    } finally {
        allowedAngular.destroy();
    }

    const createReact = (granted) => {
        const requests = [];
        const checked = [];
        const transitions = [];
        const client = new runtime.react.client.ActionRequestClient(
            baseUrl,
            async (url, init) => {
                requests.push({ url, init });
                return { ok: true, status: 200, json: async () => result };
            }
        );
        const hooks = runtime.react.hooks.createActionRequestHooks(
            reactHooksPort(transitions),
            client,
            {
                has(candidate) {
                    checked.push(candidate);
                    return granted.has(candidate);
                },
            }
        );
        return { checked, hooks, requests, transitions };
    };

    const deniedReact = createReact(deniedPermissions);
    let reactFailure;
    try {
        await deniedReact.hooks[reactHook]().execute(input);
    } catch (error) {
        reactFailure = error;
    }
    assertPermissionError(
        reactFailure,
        runtime.react.hooks.PermissionDeniedError,
        expectedMissing,
        'ReactJS'
    );
    assert.deepEqual(
        deniedReact.checked,
        permissions,
        'ReactJS: every declared permission must be evaluated'
    );
    assert.deepEqual(
        deniedReact.requests,
        [],
        'ReactJS: denied command must not reach fetch'
    );
    assert.deepEqual(
        deniedReact.transitions.map(({ status }) => status),
        ['pending', 'error'],
        'ReactJS: denial must become an observable error state'
    );

    const allowedReact = createReact(new Set(permissions));
    assert.deepEqual(
        await allowedReact.hooks[reactHook]().execute(input),
        result,
        'ReactJS: granted command result'
    );
    assert.equal(
        allowedReact.requests.length,
        1,
        'ReactJS: granted command reaches fetch exactly once'
    );
    assert.deepEqual(
        allowedReact.transitions.map(({ status }) => status),
        ['pending', 'success'],
        'ReactJS: granted command state'
    );
}
