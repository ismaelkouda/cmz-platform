import { useCallback, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionRequestClient } from '../../.stack-test-runtime/reactjs/action-request-authorized/src/action-request-client';
import {
    createActionRequestHooks,
    PermissionDeniedError,
} from '../../.stack-test-runtime/reactjs/action-request-authorized/src/use-action-request-commands';

const reactHooks = { useCallback, useState };
const input = {
    email: 'person@example.com',
    subject: 'Cannot open a report',
    message: 'The report remains unavailable.',
    priority: 'high',
};
const result = {
    request_id: 'support-42',
    message: 'Request accepted',
};

afterEach(cleanup);

function configure(granted: ReadonlySet<string>) {
    const fetch = vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => result,
    }));
    const has = vi.fn((permission: string) => granted.has(permission));
    const client = new ActionRequestClient('https://api.example.test/', fetch);
    const hooks = createActionRequestHooks(reactHooks, client, { has });
    return { fetch, has, hooks };
}

describe('permissions ReactJS action-request', () => {
    it('refuse avant fetch et publie un état error stable si la permission manque', async () => {
        const { fetch, has, hooks } = configure(new Set());
        const rendered = renderHook(() => hooks.useContactSupport());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.execute(input);
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toBeInstanceOf(PermissionDeniedError);
        expect(failure).toMatchObject({
            name: 'PermissionDeniedError',
            code: 'permission_denied',
            missingPermissions: ['support.submit'],
        });
        expect(rendered.result.current.state).toMatchObject({
            status: 'error',
            error: failure,
        });
        expect(has).toHaveBeenCalledExactlyOnceWith('support.submit');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('exécute fetch exactement une fois lorsque toutes les permissions sont présentes', async () => {
        const { fetch, has, hooks } = configure(new Set(['support.submit']));
        const rendered = renderHook(() => hooks.useContactSupport());

        await act(async () => {
            await expect(
                rendered.result.current.execute(input)
            ).resolves.toEqual(result);
        });

        expect(rendered.result.current.state).toEqual({
            status: 'success',
            value: result,
        });
        expect(has).toHaveBeenCalledExactlyOnceWith('support.submit');
        expect(fetch).toHaveBeenCalledOnce();
    });
});
