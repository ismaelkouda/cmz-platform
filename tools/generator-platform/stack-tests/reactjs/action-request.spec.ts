import { useCallback, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionRequestClient } from '../../.stack-test-runtime/reactjs/action-request/src/action-request-client';
import { createActionRequestHooks } from '../../.stack-test-runtime/reactjs/action-request/src/use-action-request-commands';

import {
    loginInput,
    loginResult,
} from '../../oracles/action-request-runtime-oracle.mjs';

const reactHooks = { useCallback, useState };

afterEach(cleanup);

function createClient(response: unknown, requests: unknown[] = []) {
    return new ActionRequestClient(
        'https://auth.example.test/',
        async (url: string, init: Record<string, unknown>) => {
            requests.push({ url, ...init });
            return {
                ok: !(response instanceof Error),
                status: response instanceof Error ? 503 : 200,
                json: async () => response,
            };
        }
    );
}

describe('sortie ReactJS action-request', () => {
    it('exécute le hook avec le runtime React réel et publie son état', async () => {
        const requests: Array<Record<string, unknown>> = [];
        const persist = vi.fn(async () => undefined);
        const hooks = createActionRequestHooks(
            reactHooks,
            createClient(loginResult, requests),
            { persist }
        );
        const rendered = renderHook(() => hooks.useLogin());
        let output: unknown;

        await act(async () => {
            output = await rendered.result.current.execute(loginInput);
        });

        expect(output).toEqual(loginResult);
        expect(rendered.result.current.state).toEqual({
            status: 'success',
            value: loginResult,
        });
        expect(persist).toHaveBeenCalledExactlyOnceWith(
            loginResult.user,
            loginResult.token
        );
        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({
            authentication: 'none',
            method: 'POST',
            url: 'https://auth.example.test/login',
        });
    });

    it('publie un état error et propage l’échec du transport', async () => {
        const persist = vi.fn(async () => undefined);
        const hooks = createActionRequestHooks(
            reactHooks,
            createClient(new Error('network unavailable')),
            { persist }
        );
        const rendered = renderHook(() => hooks.useLogin());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.execute(loginInput);
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toEqual(new Error('HTTP 503'));
        expect(rendered.result.current.state).toMatchObject({
            status: 'error',
        });
        expect(persist).not.toHaveBeenCalled();
    });
});
