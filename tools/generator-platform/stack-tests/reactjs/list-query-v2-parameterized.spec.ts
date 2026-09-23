import { useCallback, useEffect, useRef, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ListReportActionTypesClient,
    type ListQueryFetchRequest,
    type ListQueryFetchResponse,
} from '../../.stack-test-runtime/reactjs/list-query-v2-tasks-actions-processing-type/src/list-report-action-types.client';
import { createListReportActionTypesHooks } from '../../.stack-test-runtime/reactjs/list-query-v2-tasks-actions-processing-type/src/use-list-report-action-types';
import { InvalidPayloadError } from '../../.stack-test-runtime/reactjs/list-query-v2-tasks-actions-processing-type/src/errors';

const reactHooks = { useCallback, useEffect, useRef, useState };
const baseUrl = 'https://report.example.test/';

function response(payload: unknown): ListQueryFetchResponse {
    return { ok: true, status: 200, json: async () => payload };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise, resolve };
}

function payload(operators: readonly unknown[] = ['mtn', 'orange']) {
    return {
        error: false,
        message: 'OK',
        data: [
            {
                code: 'contact-customer',
                name: 'Contacter le client',
                operators,
            },
        ],
    };
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('list-query v2 React — path et tableau imbriqué réels', () => {
    it('encode le report id et décode chaque opérateur autorisé', async () => {
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListReportActionTypesClient(
            baseUrl,
            async (request) => {
                requests.push(request);
                return response(payload());
            }
        );
        const hooks = createListReportActionTypesHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListReportActionTypes());

        await act(async () =>
            rendered.result.current.load({
                reportUniqId: 'report/équipe A',
            })
        );

        expect(requests[0]).toMatchObject({
            serviceId: 'report-api',
            url: `${baseUrl}processing-actions/report%2F%C3%A9quipe%20A/report-types`,
            isRefresh: false,
            policy: {
                authentication: { mode: 'host' },
                cache: { mode: 'host', scope: 'principal' },
            },
        });
        expect(rendered.result.current.items).toEqual([
            {
                value: 'contact-customer',
                label: 'Contacter le client',
                operators: ['mtn', 'orange'],
            },
        ]);
    });

    it.each([
        { label: 'hors enum', operators: ['vodafone'] },
        { label: 'de type faux', operators: [42] },
    ])(
        'rejette un opérateur $label avant le read model',
        async ({ operators }) => {
            const client = new ListReportActionTypesClient(baseUrl, async () =>
                response(payload(operators))
            );
            const hooks = createListReportActionTypesHooks(reactHooks, client);
            const rendered = renderHook(() => hooks.useListReportActionTypes());
            let failure: unknown;

            await act(async () => {
                try {
                    await rendered.result.current.load({
                        reportUniqId: 'report-1',
                    });
                } catch (error: unknown) {
                    failure = error;
                }
            });

            expect(failure).toBeInstanceOf(InvalidPayloadError);
            expect(rendered.result.current.state).toBe('error');
            expect(rendered.result.current.items).toEqual([]);
        }
    );

    it('rejette un identifiant vide avant le port host', async () => {
        const fetch = vi.fn(async () => response(payload()));
        const client = new ListReportActionTypesClient(baseUrl, fetch);
        const hooks = createListReportActionTypesHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListReportActionTypes());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.load({ reportUniqId: '' });
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toBeInstanceOf(InvalidPayloadError);
        expect(fetch).not.toHaveBeenCalled();
        expect(rendered.result.current.state).toBe('error');
    });

    it('réutilise le même input au reload et demande le bypass au host', async () => {
        const refresh = deferred<ListQueryFetchResponse>();
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListReportActionTypesClient(
            baseUrl,
            async (request) => {
                requests.push(request);
                return requests.length === 1
                    ? response({ error: false, message: 'OK', data: [] })
                    : refresh.promise;
            }
        );
        const hooks = createListReportActionTypesHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListReportActionTypes());

        await act(async () =>
            rendered.result.current.load({ reportUniqId: 'report-1' })
        );
        let reload!: Promise<void>;
        await act(async () => {
            reload = rendered.result.current.reload();
            await Promise.resolve();
        });

        expect(requests).toHaveLength(2);
        expect(requests[1]?.url).toBe(
            `${baseUrl}processing-actions/report-1/report-types`
        );
        expect(requests[1]?.isRefresh).toBe(true);
        expect(rendered.result.current.state).toBe('reloading');
        refresh.resolve(response({ error: false, message: 'OK', data: [] }));
        await act(async () => reload);
        expect(rendered.result.current.state).toBe('empty');
    });

    it('annule le report précédent quand un nouvel input le supplante', async () => {
        const first = deferred<ListQueryFetchResponse>();
        const second = deferred<ListQueryFetchResponse>();
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListReportActionTypesClient(
            baseUrl,
            async (request) => {
                requests.push(request);
                return requests.length === 1 ? first.promise : second.promise;
            }
        );
        const hooks = createListReportActionTypesHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListReportActionTypes());

        let firstLoad!: Promise<void>;
        await act(async () => {
            firstLoad = rendered.result.current.load({
                reportUniqId: 'report-1',
            });
            await Promise.resolve();
        });
        let secondLoad!: Promise<void>;
        await act(async () => {
            secondLoad = rendered.result.current.load({
                reportUniqId: 'report-2',
            });
            await Promise.resolve();
        });

        expect(requests[0]?.signal.aborted).toBe(true);
        expect(requests[1]?.url).toBe(
            `${baseUrl}processing-actions/report-2/report-types`
        );
        second.resolve(response({ error: false, message: 'OK', data: [] }));
        await act(async () => secondLoad);
        first.resolve(response(payload()));
        await act(async () => firstLoad);
        expect(rendered.result.current.state).toBe('empty');
        expect(rendered.result.current.items).toEqual([]);
    });
});
