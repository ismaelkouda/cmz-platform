import { useCallback, useEffect, useRef, useState } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ListUsersClient,
    type ListQueryFetchRequest,
    type ListQueryFetchResponse,
} from '../../.stack-test-runtime/reactjs/list-query-v2-users/src/list-users.client';
import { InvalidPayloadError } from '../../.stack-test-runtime/reactjs/list-query-v2-users/src/errors';
import type { ListUsersInput } from '../../.stack-test-runtime/reactjs/list-query-v2-users/src/models';
import { createListUsersHooks } from '../../.stack-test-runtime/reactjs/list-query-v2-users/src/use-list-users';

const reactHooks = { useCallback, useEffect, useRef, useState };
const baseUrl = 'https://settings.example.test/';
const usersUrl = `${baseUrl}settings-and-security/users`;

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

function user() {
    return {
        id: 'usr-001',
        first_name: 'Awa',
        last_name: 'Kouda',
        email: 'awa.kouda@example.test',
        phone: '+2250102030405',
        profile: 'Administrateur',
        role: 'team-leader',
        status: 'active',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-24T18:00:00Z',
    };
}

function page({ items = [user()], currentPage = 2 } = {}) {
    return {
        error: false,
        message: 'SUCCESS',
        data: {
            current_page: currentPage,
            data: items,
            last_page: 3,
            per_page: 10,
            total: 21,
            first_page_url: `${usersUrl}?page=1`,
            links: [],
        },
    };
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('list-query v2 React — page et query parameters réels', () => {
    it('sérialise les filtres wire, décode la page et délègue auth/cache au host', async () => {
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListUsersClient(baseUrl, async (request) => {
            requests.push(request);
            return response(page());
        });
        const hooks = createListUsersHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListUsers());

        await act(async () =>
            rendered.result.current.load({
                page: 2,
                search: 'Awa & Mariam',
                role: 'team-leader',
                isActive: false,
            })
        );

        expect(requests[0]).toMatchObject({
            serviceId: 'settings-api',
            url: `${usersUrl}?page=2&search=Awa%20%26%20Mariam&role=team-leader&is_active=false`,
            isRefresh: false,
            policy: {
                authentication: { mode: 'host' },
                cache: { mode: 'host', scope: 'principal' },
            },
        });
        expect(rendered.result.current.items).toEqual([
            {
                uniqId: 'usr-001',
                firstName: 'Awa',
                lastName: 'Kouda',
                email: 'awa.kouda@example.test',
                phone: '+2250102030405',
                profile: 'Administrateur',
                role: 'team-leader',
                status: 'active',
                updatedAt: '2026-09-24T18:00:00Z',
            },
        ]);
        expect(rendered.result.current.page).toMatchObject({
            currentPage: 2,
            lastPage: 3,
            pageSize: 10,
            totalItems: 21,
        });
        expect(rendered.result.current.state).toBe('success');
    });

    it('omet les filtres facultatifs absents et classe une page vide comme vide', async () => {
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListUsersClient(baseUrl, async (request) => {
            requests.push(request);
            return response(page({ items: [], currentPage: 1 }));
        });
        const hooks = createListUsersHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListUsers());

        await act(async () => rendered.result.current.load({ page: 1 }));

        expect(requests[0]?.url).toBe(`${usersUrl}?page=1`);
        expect(rendered.result.current.items).toEqual([]);
        expect(rendered.result.current.page?.totalItems).toBe(21);
        expect(rendered.result.current.state).toBe('empty');
    });

    it.each([
        { label: 'page hors borne', input: { page: 0 } },
        { label: 'recherche vide présente', input: { page: 1, search: '' } },
        { label: 'rôle hors contrat', input: { page: 1, role: 'admin' } },
        {
            label: 'booléen de type faux',
            input: { page: 1, isActive: 'false' },
        },
    ])('rejette $label avant le port host', async ({ input }) => {
        const fetch = vi.fn(async () => response(page()));
        const client = new ListUsersClient(baseUrl, fetch);
        const hooks = createListUsersHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListUsers());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.load(
                    input as unknown as ListUsersInput
                );
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toBeInstanceOf(InvalidPayloadError);
        expect(fetch).not.toHaveBeenCalled();
        expect(rendered.result.current.state).toBe('error');
    });

    it('rejette une métadonnée de page invalide avec son chemin wire exact', async () => {
        const payload = page({ currentPage: 1 });
        payload.data.current_page = '1' as unknown as number;
        const client = new ListUsersClient(baseUrl, async () =>
            response(payload)
        );
        const hooks = createListUsersHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListUsers());
        let failure: unknown;

        await act(async () => {
            try {
                await rendered.result.current.load({ page: 1 });
            } catch (error: unknown) {
                failure = error;
            }
        });

        expect(failure).toBeInstanceOf(InvalidPayloadError);
        expect((failure as Error).message).toContain('$.data.current_page');
        expect(rendered.result.current.state).toBe('error');
    });

    it('préserve la page et les paramètres exacts pendant un reload en échec', async () => {
        const refresh = deferred<ListQueryFetchResponse>();
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListUsersClient(baseUrl, async (request) => {
            requests.push(request);
            return requests.length === 1 ? response(page()) : refresh.promise;
        });
        const hooks = createListUsersHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListUsers());

        await act(async () =>
            rendered.result.current.load({
                page: 2,
                profile: 'Administrateur',
            })
        );
        let reload!: Promise<void>;
        await act(async () => {
            reload = rendered.result.current.reload();
            await Promise.resolve();
        });

        expect(requests[1]?.url).toBe(
            `${usersUrl}?page=2&profile=Administrateur`
        );
        expect(requests[1]?.isRefresh).toBe(true);
        expect(rendered.result.current.state).toBe('reloading');
        expect(rendered.result.current.items).toHaveLength(1);
        refresh.resolve(response({ error: true, message: 'Reload refusé' }));
        await act(async () => {
            try {
                await reload;
            } catch {
                // L'erreur est observable dans le binding et par l'appelant.
            }
        });
        expect(rendered.result.current.state).toBe('error');
        expect(rendered.result.current.page?.currentPage).toBe(2);
        expect(rendered.result.current.items).toHaveLength(1);
    });

    it('annule la page précédente lorsqu’un nouvel input la remplace', async () => {
        const first = deferred<ListQueryFetchResponse>();
        const second = deferred<ListQueryFetchResponse>();
        const requests: ListQueryFetchRequest[] = [];
        const client = new ListUsersClient(baseUrl, async (request) => {
            requests.push(request);
            return requests.length === 1 ? first.promise : second.promise;
        });
        const hooks = createListUsersHooks(reactHooks, client);
        const rendered = renderHook(() => hooks.useListUsers());

        let firstLoad!: Promise<void>;
        await act(async () => {
            firstLoad = rendered.result.current.load({ page: 1 });
            await Promise.resolve();
        });
        let secondLoad!: Promise<void>;
        await act(async () => {
            secondLoad = rendered.result.current.load({ page: 2 });
            await Promise.resolve();
        });

        expect(requests[0]?.signal.aborted).toBe(true);
        expect(requests[1]?.url).toBe(`${usersUrl}?page=2`);
        second.resolve(response(page()));
        await act(async () => secondLoad);
        first.resolve(response(page({ items: [], currentPage: 1 })));
        await act(async () => firstLoad);
        expect(rendered.result.current.page?.currentPage).toBe(2);
        expect(rendered.result.current.items).toHaveLength(1);
    });
});
