import { useCallback, useEffect, useRef, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ListSiteGroupsClient,
    ListQueryHttpError,
    type ListQueryFetchRequest,
    type ListQueryFetchResponse,
} from '../../.stack-test-runtime/reactjs/list-query-v2/src/list-site-groups.client';
import { createListSiteGroupsHooks } from '../../.stack-test-runtime/reactjs/list-query-v2/src/use-list-site-groups';
import {
    InvalidPayloadError,
    ServerResponseError,
} from '../../.stack-test-runtime/reactjs/list-query-v2/src/errors';
import { ListHomeBlockInfosClient } from '../../.stack-test-runtime/reactjs/list-query-v2-public/src/list-home-block-infos.client';

const reactHooks = { useCallback, useEffect, useRef, useState };
const baseUrl = 'https://settings.example.test/';

function response(payload: unknown, status = 200): ListQueryFetchResponse {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => payload,
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

function successPayload(id: string, name: string) {
    return {
        error: false,
        message: 'OK',
        data: [{ id, name, description: 'Wire only' }],
    };
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('list-query v2 React — port host et hooks réels', () => {
    it('mappe le DTO et transmet au host service, auth, cache et signal', async () => {
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListSiteGroupsClient(baseUrl, async (request) => {
            requests.push(request);
            return response(successPayload('group-1', 'Groupe principal'));
        });
        const hooks = createListSiteGroupsHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListSiteGroups());

        expect(rendered.result.current.state).toBe('idle');
        await act(async () => rendered.result.current.load());

        expect(rendered.result.current.state).toBe('success');
        expect(rendered.result.current.items).toEqual([
            { value: 'group-1', label: 'Groupe principal' },
        ]);
        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({
            serviceId: 'settings-api',
            url: `${baseUrl}infrastructures/site-groups`,
            method: 'GET',
            isRefresh: false,
            policy: {
                authentication: {
                    mode: 'host',
                    schemes: [
                        {
                            id: 'backoffice-session-bearer',
                            kind: 'bearer',
                        },
                    ],
                },
                cache: {
                    mode: 'host',
                    scope: 'principal',
                    refresh: 'bypass',
                },
            },
        });
        expect(requests[0]?.signal).toBeInstanceOf(AbortSignal);
    });

    it('préserve les données pendant reload et demande le bypass au host', async () => {
        const refresh = deferred<ListQueryFetchResponse>();
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListSiteGroupsClient(baseUrl, async (request) => {
            requests.push(request);
            return requests.length === 1
                ? response(successPayload('stale', 'Ancien'))
                : refresh.promise;
        });
        const hooks = createListSiteGroupsHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListSiteGroups());
        await act(async () => rendered.result.current.load());

        let reload!: Promise<void>;
        await act(async () => {
            reload = rendered.result.current.reload();
            await Promise.resolve();
        });
        expect(rendered.result.current.state).toBe('reloading');
        expect(rendered.result.current.items).toEqual([
            { value: 'stale', label: 'Ancien' },
        ]);
        expect(requests[1]?.isRefresh).toBe(true);

        refresh.resolve(response(successPayload('fresh', 'Nouveau')));
        await act(async () => reload);
        expect(rendered.result.current.state).toBe('success');
        expect(rendered.result.current.items).toEqual([
            { value: 'fresh', label: 'Nouveau' },
        ]);
    });

    it('rejette le payload avant le domaine et conserve la dernière valeur', async () => {
        let call = 0;
        const client = new ListSiteGroupsClient(baseUrl, async () => {
            call += 1;
            return response(
                call === 1
                    ? successPayload('stale', 'Conservé')
                    : {
                          error: false,
                          message: 'OK',
                          data: [
                              {
                                  id: 42,
                                  name: 'Invalide',
                                  description: 'Wire only',
                              },
                          ],
                      }
            );
        });
        const hooks = createListSiteGroupsHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListSiteGroups());
        await act(async () => rendered.result.current.load());

        let failure: unknown;
        await act(async () => {
            try {
                await rendered.result.current.reload();
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toBeInstanceOf(InvalidPayloadError);
        expect(rendered.result.current.state).toBe('error');
        expect(rendered.result.current.error).toBe(failure);
        expect(rendered.result.current.items).toEqual([
            { value: 'stale', label: 'Conservé' },
        ]);
    });

    it('publie explicitement une erreur métier du serveur', async () => {
        const client = new ListSiteGroupsClient(baseUrl, async () =>
            response({
                error: true,
                message: 'Accès refusé',
                data: [],
            })
        );
        const hooks = createListSiteGroupsHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListSiteGroups());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.load();
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toBeInstanceOf(ServerResponseError);
        expect(failure).toMatchObject({
            code: 'SERVER_RESPONSE_ERROR',
            serverMessage: 'Accès refusé',
        });
        expect(rendered.result.current.state).toBe('error');
        expect(rendered.result.current.error).toBe(failure);
    });

    it('conserve le statut HTTP non réussi sans tenter de décoder son corps', async () => {
        const json = vi.fn(async () => successPayload('ignored', 'Ignoré'));
        const client = new ListSiteGroupsClient(baseUrl, async () => ({
            ok: false,
            status: 503,
            json,
        }));
        const hooks = createListSiteGroupsHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListSiteGroups());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.load();
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toBeInstanceOf(ListQueryHttpError);
        expect(failure).toMatchObject({ status: 503 });
        expect(json).not.toHaveBeenCalled();
        expect(rendered.result.current.state).toBe('error');
    });

    it('refuse reload avant un premier load sans appeler le port host', async () => {
        const fetch = vi.fn(async () =>
            response(successPayload('unexpected', 'Inattendu'))
        );
        const client = new ListSiteGroupsClient(baseUrl, fetch);
        const hooks = createListSiteGroupsHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListSiteGroups());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.reload();
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toEqual(new Error('reload requires a previous load'));
        expect(fetch).not.toHaveBeenCalled();
        expect(rendered.result.current.state).toBe('idle');
    });

    it('annule la requête supplantée et ignore sa réponse tardive', async () => {
        const first = deferred<ListQueryFetchResponse>();
        const second = deferred<ListQueryFetchResponse>();
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListSiteGroupsClient(baseUrl, async (request) => {
            requests.push(request);
            return requests.length === 1 ? first.promise : second.promise;
        });
        const hooks = createListSiteGroupsHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListSiteGroups());

        let firstLoad!: Promise<void>;
        await act(async () => {
            firstLoad = rendered.result.current.load();
            await Promise.resolve();
        });
        let secondLoad!: Promise<void>;
        await act(async () => {
            secondLoad = rendered.result.current.load();
            await Promise.resolve();
        });
        expect(requests[0]?.signal.aborted).toBe(true);

        second.resolve(response(successPayload('latest', 'Dernier')));
        await act(async () => secondLoad);
        first.resolve(response(successPayload('obsolete', 'Obsolète')));
        await act(async () => firstLoad);

        expect(rendered.result.current.items).toEqual([
            { value: 'latest', label: 'Dernier' },
        ]);
    });

    it('annule la requête en vol au démontage du composant', async () => {
        const pending = deferred<ListQueryFetchResponse>();
        let request: ListQueryFetchRequest | undefined;
        const client = new ListSiteGroupsClient(baseUrl, async (next) => {
            request = next;
            return pending.promise;
        });
        const hooks = createListSiteGroupsHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListSiteGroups());

        let load!: Promise<void>;
        await act(async () => {
            load = rendered.result.current.load();
            await Promise.resolve();
        });
        rendered.unmount();
        expect(request?.signal.aborted).toBe(true);
        pending.resolve(response(successPayload('ignored', 'Ignoré')));
        await load;
    });

    it('une query publique transmet omit et jamais une identité Bearer', async () => {
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListHomeBlockInfosClient(
            'https://content.example.test/',
            async (request) => {
                requests.push(request);
                return response({ error: false, message: 'OK', data: [] });
            }
        );
        await client.readAll({
            isRefresh: false,
            signal: new AbortController().signal,
        });

        expect(requests[0]?.policy.authentication).toEqual({ mode: 'omit' });
        expect(requests[0]?.policy.cache.scope).toBe('public');
        expect(JSON.stringify(requests[0])).not.toContain('bearer');
    });
});
