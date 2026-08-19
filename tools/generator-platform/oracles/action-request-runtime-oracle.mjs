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

/**
 * PLAT-7 (2026-08-19) : le domaine `authentication` (fixture partagée par
 * tous les oracles de ce fichier) porte désormais `response_envelope:
 * "simple"` sur ses 3 intégrations HTTP. Le backend réel fourni par
 * l'utilisateur (`/auth/v1.0/backoffice/`) enveloppe systématiquement sa
 * réponse dans `{error, message, data}` — cette forme est reproduite
 * ci-dessous, calquée sur la simulation statique fournie (succès avec
 * `data.user`/`data.token` imbriqués, échec applicatif `error: true` avec
 * `statusCode`). `envelopeSuccess`/`envelopeFailure` sont les seules
 * réponses transportées sur le réseau simulé désormais : la preuve porte
 * sur le déballage réel (`unwrapResponseEnvelope`), pas sur un domaine
 * synthétique séparé.
 * @see docs/architecture/taches-restantes.md, entrée PLAT-7.
 */
function envelopeSuccess(data) {
    return { error: false, message: 'OK', data };
}
function envelopeFailure(message, statusCode) {
    return { error: true, statusCode, message };
}
export const envelopedLoginResult = envelopeSuccess(loginResult);
export const envelopedMessageResult = envelopeSuccess(messageResult);
export const applicationErrorEnvelope = envelopeFailure(
    'Email ou mot de passe incorrect',
    400
);
export const integrityErrorEnvelope = { error: false, message: 'OK' };

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
            url.endsWith('/login')
                ? envelopedLoginResult
                : envelopedMessageResult,
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
        responseFor: () => envelopedLoginResult,
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

/**
 * PLAT-7 (2026-08-19) : exerce le déballage d'enveloppe réel
 * (`unwrapResponseEnvelope`, généré dans `action-request-client.ts`) sur les
 * deux cas fail-closed du contrat legacy `unwrapResponse` — erreur
 * applicative (`error: true`, ex. identifiants incorrects) et erreur
 * d'intégrité (`data` absent malgré `error: false`). Le transport HTTP
 * réussit dans les deux cas (`response.ok === true`) : c'est le déballage,
 * pas le transport, qui doit rejeter.
 */
export async function assertAngularEnvelopeOracle(runtime) {
    const applicationError = createAngularRuntime(runtime, {
        responseFor: () => applicationErrorEnvelope,
        persist: async () =>
            assert.fail('session must not run after an application error'),
    });
    try {
        await assert.rejects(
            firstValueFrom(applicationError.commands.login(loginInput)),
            /Email ou mot de passe incorrect/,
            'Angular: response_envelope error:true must reject with the envelope message'
        );
    } finally {
        applicationError.destroy();
    }

    const integrityError = createAngularRuntime(runtime, {
        responseFor: () => integrityErrorEnvelope,
        persist: async () =>
            assert.fail('session must not run after an integrity error'),
    });
    try {
        await assert.rejects(
            firstValueFrom(integrityError.commands.login(loginInput)),
            /missing its data payload/,
            'Angular: response_envelope with no data must reject as an integrity error'
        );
    } finally {
        integrityError.destroy();
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
            url.endsWith('/login')
                ? envelopedLoginResult
                : envelopedMessageResult,
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
        responseFor: () => envelopedLoginResult,
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

/**
 * PLAT-7 (2026-08-19) : pendant React du même déballage d'enveloppe que
 * `assertAngularEnvelopeOracle` — voir sa documentation pour le contexte.
 */
export async function assertReactEnvelopeOracle(runtime) {
    const applicationError = createReactRuntime(runtime, {
        responseFor: () => applicationErrorEnvelope,
        persist: async () =>
            assert.fail('session must not run after an application error'),
    });
    await assert.rejects(
        applicationError.hooks.useLogin().execute(loginInput),
        /Email ou mot de passe incorrect/,
        'ReactJS: response_envelope error:true must reject with the envelope message'
    );
    assert.equal(
        applicationError.transitions.at(-1).status,
        'error',
        'ReactJS: application error state'
    );

    const integrityError = createReactRuntime(runtime, {
        responseFor: () => integrityErrorEnvelope,
        persist: async () =>
            assert.fail('session must not run after an integrity error'),
    });
    await assert.rejects(
        integrityError.hooks.useLogin().execute(loginInput),
        /missing its data payload/,
        'ReactJS: response_envelope with no data must reject as an integrity error'
    );
    assert.equal(
        integrityError.transitions.at(-1).status,
        'error',
        'ReactJS: integrity error state'
    );
}
