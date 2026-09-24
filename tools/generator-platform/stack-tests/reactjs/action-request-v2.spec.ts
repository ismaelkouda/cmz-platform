import { useCallback, useEffect, useRef, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ActionRequestHttpError,
    ForgotPasswordClient,
    type ActionRequestFetchRequest,
    type ActionRequestFetchResponse,
} from '../../.stack-test-runtime/reactjs/action-request-v2/src/forgot-password.client';
import { ServerResponseError } from '../../.stack-test-runtime/reactjs/action-request-v2/src/forgot-password.decoder';
import {
    ActionRequestPendingError,
    createForgotPasswordHooks,
} from '../../.stack-test-runtime/reactjs/action-request-v2/src/use-forgot-password';
import { InvalidPayloadError } from '../../.stack-test-runtime/reactjs/action-request-v2/src/validation';

const reactHooks = { useCallback, useEffect, useRef, useState };
const baseUrl = 'https://auth.example.test/';

function response(payload: unknown, status = 200): ActionRequestFetchResponse {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
    };
}

function successPayload(message = 'Reset instructions sent.') {
    return {
        error: false,
        message: 'OK',
        data: { message },
    };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('action-request v2 React — port host et hook réel', () => {
    it('transmet au host le payload et la politique publique exacts', async () => {
        const requests: ActionRequestFetchRequest[] = [];
        const client = new ForgotPasswordClient(baseUrl, async (request) => {
            requests.push(request);
            return response(successPayload());
        });
        const hooks = createForgotPasswordHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useForgotPassword());

        expect(rendered.result.current.state).toBe('idle');
        let result: unknown;
        await act(async () => {
            result = await rendered.result.current.submit({
                email: 'person@example.com',
            });
        });

        expect(result).toEqual({ message: 'Reset instructions sent.' });
        expect(rendered.result.current).toMatchObject({
            state: 'success',
            result: { message: 'Reset instructions sent.' },
            error: undefined,
        });
        expect(requests).toHaveLength(1);
        expect(requests[0]).toEqual({
            serviceId: 'authentication-api',
            url: 'https://auth.example.test/forgot-password',
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            policy: { authentication: { mode: 'omit' } },
            body: { email: 'person@example.com' },
        });
        expect(JSON.stringify(requests[0])).not.toMatch(/Bearer|Authorization/);
    });

    it('rejette les entrées invalides avant le port host', async () => {
        const fetch = vi.fn(async () => response(successPayload()));
        const client = new ForgotPasswordClient(baseUrl, fetch);
        const hooks = createForgotPasswordHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useForgotPassword());

        let invalid: unknown;
        await act(async () => {
            try {
                await rendered.result.current.submit({ email: 'invalid' });
            } catch (error: unknown) {
                invalid = error;
            }
        });
        expect(invalid).toBeInstanceOf(InvalidPayloadError);
        expect(fetch).not.toHaveBeenCalled();
        expect(rendered.result.current.state).toBe('error');

        await expect(
            rendered.result.current.submit({
                email: ' person@example.com ',
            })
        ).rejects.toBeInstanceOf(InvalidPayloadError);
        await expect(
            rendered.result.current.submit({
                email: 'person@example.com',
                extra: 'invented',
            } as never)
        ).rejects.toBeInstanceOf(InvalidPayloadError);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('efface le résultat précédent au début de la tentative suivante', async () => {
        const pending = deferred<ActionRequestFetchResponse>();
        let call = 0;
        const client = new ForgotPasswordClient(baseUrl, async () => {
            call += 1;
            return call === 1
                ? response(successPayload('Accepted.'))
                : pending.promise;
        });
        const hooks = createForgotPasswordHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useForgotPassword());

        await act(async () => {
            await rendered.result.current.submit({
                email: 'person@example.com',
            });
        });
        expect(rendered.result.current.result).toEqual({
            message: 'Accepted.',
        });

        let second!: Promise<unknown>;
        await act(async () => {
            second = rendered.result.current.submit({
                email: 'person@example.com',
            });
            await Promise.resolve();
        });
        expect(rendered.result.current.state).toBe('submitting');
        expect(rendered.result.current.result).toBeUndefined();

        pending.resolve(response(successPayload('Updated.')));
        await act(async () => second);
        expect(rendered.result.current.result).toEqual({ message: 'Updated.' });
    });

    it('refuse les réponses et enveloppes contenant des champs inconnus', async () => {
        const payloads = [
            {
                error: false,
                message: 'OK',
                data: { message: 'Accepted.', extra: 'invented' },
            },
            { ...successPayload('Accepted.'), extra: 'invented' },
        ];
        const client = new ForgotPasswordClient(baseUrl, async () =>
            response(payloads.shift())
        );
        const hooks = createForgotPasswordHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useForgotPassword());

        for (const email of ['first@example.com', 'second@example.com']) {
            let failure: unknown;
            await act(async () => {
                try {
                    await rendered.result.current.submit({ email });
                } catch (error: unknown) {
                    failure = error;
                }
            });
            expect(failure).toBeInstanceOf(InvalidPayloadError);
            expect(rendered.result.current.state).toBe('error');
        }
    });

    it('distingue erreur HTTP, statut 2xx hors contrat et erreur métier', async () => {
        const httpJson = vi.fn(async () => successPayload());
        const responses = [
            { ok: false, status: 503, json: httpJson },
            response(successPayload(), 201),
            response({
                error: true,
                message: 'Account is locked.',
                data: null,
            }),
        ];
        const client = new ForgotPasswordClient(baseUrl, async () =>
            responses.shift()!
        );
        const hooks = createForgotPasswordHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useForgotPassword());

        const failures: unknown[] = [];
        for (const email of [
            'http@example.com',
            'status@example.com',
            'business@example.com',
        ]) {
            await act(async () => {
                try {
                    await rendered.result.current.submit({ email });
                } catch (error: unknown) {
                    failures.push(error);
                }
            });
        }

        expect(failures[0]).toBeInstanceOf(ActionRequestHttpError);
        expect(failures[0]).toMatchObject({ status: 503 });
        expect(httpJson).not.toHaveBeenCalled();
        expect(failures[1]).toBeInstanceOf(InvalidPayloadError);
        expect(failures[1]).toMatchObject({
            path: '$.status',
            expected: 'HTTP 200',
        });
        expect(failures[2]).toBeInstanceOf(ServerResponseError);
        expect(failures[2]).toMatchObject({
            serverMessage: 'Account is locked.',
        });
    });

    it('refuse un double submit sans perturber la mutation active', async () => {
        const pending = deferred<ActionRequestFetchResponse>();
        const requests: ActionRequestFetchRequest[] = [];
        const client = new ForgotPasswordClient(baseUrl, async (request) => {
            requests.push(request);
            return pending.promise;
        });
        const hooks = createForgotPasswordHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useForgotPassword());

        let first!: Promise<unknown>;
        await act(async () => {
            first = rendered.result.current.submit({
                email: 'first@example.com',
            });
            await Promise.resolve();
        });
        expect(rendered.result.current.state).toBe('submitting');

        await expect(
            rendered.result.current.submit({ email: 'second@example.com' })
        ).rejects.toBeInstanceOf(ActionRequestPendingError);
        expect(requests).toHaveLength(1);
        expect(rendered.result.current.state).toBe('submitting');

        pending.resolve(response(successPayload('Accepted.')));
        await act(async () => first);
        expect(rendered.result.current.state).toBe('success');
    });

    it('ne simule aucune annulation distante au démontage', async () => {
        const pending = deferred<ActionRequestFetchResponse>();
        let request: ActionRequestFetchRequest | undefined;
        const client = new ForgotPasswordClient(baseUrl, async (next) => {
            request = next;
            return pending.promise;
        });
        const hooks = createForgotPasswordHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useForgotPassword());

        let submission!: Promise<unknown>;
        await act(async () => {
            submission = rendered.result.current.submit({
                email: 'person@example.com',
            });
            await Promise.resolve();
        });
        rendered.unmount();

        expect(request).toBeDefined();
        expect(request).not.toHaveProperty('signal');
        pending.resolve(response(successPayload('Committed.')));
        await expect(submission).resolves.toEqual({ message: 'Committed.' });
    });
});
