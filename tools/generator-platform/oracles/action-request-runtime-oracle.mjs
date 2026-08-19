import assert from 'node:assert/strict';

import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { createEnvironmentInjector } from '@angular/core';
import { firstValueFrom, of, throwError } from 'rxjs';

export const loginInput = {
    email: 'person@example.com',
    password: 'secret',
};
export const forgotInput = { email: 'person@example.com' };
export const resetInput = {
    token: 'recovery-token',
    email: 'person@example.com',
    password: 'new-secret',
    confirm_password: 'new-secret',
};
export const loginResult = {
    user: { id: 'user-1' },
    token: { value: 'token-1' },
    message: 'connected',
};
export const messageResult = { message: 'accepted' };

function issue(field, rule) {
    return { field, rule };
}

const validationCases = [
    ['validateLoginInput', loginInput, []],
    [
        'validateLoginInput',
        { email: ' ', password: 'secret' },
        [issue('email', 'required'), issue('email', 'format:email')],
    ],
    [
        'validateLoginInput',
        { email: 'invalid', password: 'secret' },
        [issue('email', 'format:email')],
    ],
    [
        'validateLoginInput',
        { email: 'person@example.com', password: '' },
        [issue('password', 'required')],
    ],
    ['validateForgotPasswordInput', forgotInput, []],
    [
        'validateForgotPasswordInput',
        { email: '' },
        [issue('email', 'required'), issue('email', 'format:email')],
    ],
    ['validateResetPasswordInput', resetInput, []],
    [
        'validateResetPasswordInput',
        { ...resetInput, confirm_password: 'different' },
        [issue('confirm_password', 'equals:password')],
    ],
    [
        'validateResetPasswordInput',
        {
            ...resetInput,
            token: '',
            email: '',
            password: '',
            confirm_password: '',
        },
        [
            issue('token', 'required'),
            issue('email', 'required'),
            issue('email', 'format:email'),
            issue('password', 'required'),
            issue('confirm_password', 'required'),
        ],
    ],
];

export function assertValidationOracle(validation, target) {
    for (const [validator, input, expected] of validationCases) {
        assert.deepEqual(
            validation[validator](input),
            expected,
            `${target}: ${validator} must preserve the canonical constraints`
        );
    }
}

function createAngularRuntime(runtime, { responseFor, persist }) {
    const requests = [];
    const http = {
        post(url, body, options) {
            requests.push({
                method: 'POST',
                url,
                body,
                public: options.context.get(
                    runtime.angular.client.PUBLIC_REQUEST
                ),
            });
            const response = responseFor(url);
            return response instanceof Error
                ? throwError(() => response)
                : of(response);
        },
    };
    const providers = [
        { provide: HttpClient, useValue: http },
        {
            provide: runtime.angular.client.ACTION_REQUEST_BASE_URL,
            useValue: 'https://auth.example.test/',
        },
        runtime.angular.client.ActionRequestClient,
        runtime.angular.commands.SESSION_PORT && {
            provide: runtime.angular.commands.SESSION_PORT,
            useValue: { persist },
        },
        runtime.angular.commands.ActionRequestCommands,
    ].filter(Boolean);
    const injector = createEnvironmentInjector(providers, null);
    return {
        commands: injector.get(runtime.angular.commands.ActionRequestCommands),
        destroy: () => injector.destroy(),
        requests,
    };
}

export async function assertAngularNominalOracle(runtime) {
    const events = [];
    const angular = createAngularRuntime(runtime, {
        responseFor: (url) =>
            url.endsWith('/login') ? loginResult : messageResult,
        persist: async (user, token) => {
            events.push(['persist-start', user, token]);
            await Promise.resolve();
            events.push(['persist-end']);
        },
    });
    try {
        const login = await firstValueFrom(angular.commands.login(loginInput));
        events.push(['emitted']);
        assert.deepEqual(login, loginResult, 'Angular: login result');
        assert.deepEqual(
            await firstValueFrom(angular.commands.forgotPassword(forgotInput)),
            messageResult,
            'Angular: forgot-password result'
        );
        assert.deepEqual(
            await firstValueFrom(angular.commands.resetPassword(resetInput)),
            messageResult,
            'Angular: reset-password result'
        );
        assert.deepEqual(
            events.map(([event]) => event),
            ['persist-start', 'persist-end', 'emitted'],
            'Angular: login must persist the session before success'
        );
        assert.deepEqual(
            angular.requests.map(({ method, url, public: isPublic }) => ({
                method,
                url,
                public: isPublic,
            })),
            [
                {
                    method: 'POST',
                    url: 'https://auth.example.test/login',
                    public: true,
                },
                {
                    method: 'POST',
                    url: 'https://auth.example.test/forgot-password',
                    public: true,
                },
                {
                    method: 'POST',
                    url: 'https://auth.example.test/reset-password',
                    public: true,
                },
            ],
            'Angular: transport and public-access contract'
        );
        assert.deepEqual(
            angular.requests.map(({ body }) => body),
            [loginInput, forgotInput, resetInput],
            'Angular: request bodies'
        );
    } finally {
        angular.destroy();
    }
}

export async function assertAngularFailureOracle(runtime) {
    const transport = createAngularRuntime(runtime, {
        responseFor: () => new Error('network unavailable'),
        persist: async () =>
            assert.fail('session must not run after HTTP failure'),
    });
    try {
        await assert.rejects(
            firstValueFrom(transport.commands.login(loginInput)),
            /network unavailable/
        );
    } finally {
        transport.destroy();
    }

    const session = createAngularRuntime(runtime, {
        responseFor: () => loginResult,
        persist: async () => {
            throw new Error('storage unavailable');
        },
    });
    try {
        await assert.rejects(
            firstValueFrom(session.commands.login(loginInput)),
            /storage unavailable/
        );
    } finally {
        session.destroy();
    }
}

function createReactRuntime(runtime, { responseFor, persist }) {
    const requests = [];
    const fetch = async (url, init) => {
        requests.push({
            method: init.method,
            url,
            authentication: init.authentication,
            body: JSON.parse(init.body),
            contentType: init.headers['content-type'],
        });
        const response = responseFor(url);
        if (response instanceof Error) {
            return { ok: false, status: 503, json: async () => ({}) };
        }
        return { ok: true, status: 200, json: async () => response };
    };
    const client = new runtime.react.client.ActionRequestClient(
        'https://auth.example.test/',
        fetch
    );
    const transitions = [];
    const hooksPort = {
        useState(initial) {
            return [initial, (value) => transitions.push(value)];
        },
        useCallback(callback) {
            return callback;
        },
    };
    const hooks = runtime.react.hooks.createActionRequestHooks(
        hooksPort,
        client,
        { persist }
    );
    return { hooks, requests, transitions };
}

export async function assertReactNominalOracle(runtime) {
    const persisted = [];
    const react = createReactRuntime(runtime, {
        responseFor: (url) =>
            url.endsWith('/login') ? loginResult : messageResult,
        persist: async (user, token) => persisted.push({ user, token }),
    });
    assert.deepEqual(
        await react.hooks.useLogin().execute(loginInput),
        loginResult,
        'ReactJS: login result'
    );
    assert.deepEqual(
        await react.hooks.useForgotPassword().execute(forgotInput),
        messageResult,
        'ReactJS: forgot-password result'
    );
    assert.deepEqual(
        await react.hooks.useResetPassword().execute(resetInput),
        messageResult,
        'ReactJS: reset-password result'
    );
    assert.deepEqual(
        persisted,
        [{ user: loginResult.user, token: loginResult.token }],
        'ReactJS: login must be the only session-establishing command'
    );
    assert.deepEqual(
        react.transitions.map(({ status }) => status),
        ['pending', 'success', 'pending', 'success', 'pending', 'success'],
        'ReactJS: command state transitions'
    );
    assert.deepEqual(
        react.requests.map(({ method, url, authentication, contentType }) => ({
            method,
            url,
            authentication,
            contentType,
        })),
        [
            {
                method: 'POST',
                url: 'https://auth.example.test/login',
                authentication: 'none',
                contentType: 'application/json',
            },
            {
                method: 'POST',
                url: 'https://auth.example.test/forgot-password',
                authentication: 'none',
                contentType: 'application/json',
            },
            {
                method: 'POST',
                url: 'https://auth.example.test/reset-password',
                authentication: 'none',
                contentType: 'application/json',
            },
        ],
        'ReactJS: transport and authentication contract'
    );
    assert.deepEqual(
        react.requests.map(({ body }) => body),
        [loginInput, forgotInput, resetInput],
        'ReactJS: request bodies'
    );
}

export async function assertReactFailureOracle(runtime) {
    const transport = createReactRuntime(runtime, {
        responseFor: () => new Error('network unavailable'),
        persist: async () =>
            assert.fail('session must not run after HTTP failure'),
    });
    await assert.rejects(
        transport.hooks.useLogin().execute(loginInput),
        /HTTP 503/
    );
    assert.equal(
        transport.transitions.at(-1).status,
        'error',
        'ReactJS: transport failure state'
    );

    const session = createReactRuntime(runtime, {
        responseFor: () => loginResult,
        persist: async () => {
            throw new Error('storage unavailable');
        },
    });
    await assert.rejects(
        session.hooks.useLogin().execute(loginInput),
        /storage unavailable/
    );
    assert.equal(
        session.transitions.at(-1).status,
        'error',
        'ReactJS: session failure state'
    );
}
