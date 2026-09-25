import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    BYPASS_CACHE,
    HttpCacheStore,
    SETTINGS_API_URL,
    SKIP_AUTH,
    cacheInterceptor,
} from '@cmz/core';
import { ErrorHandlerRegistry, SessionService } from '@cmz/shared-application';
import { errorInterceptor } from '@cmz/shared-data';
import { InvalidPayloadError } from '@cmz/shared-domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from '../../../../apps/backoffice-angular/src/app/interceptors/auth.interceptor';
import { ListUsersFacade } from '../../.stack-test-runtime/angular/list-query-v2-users/src/list-users.facade';
import { ListUsersSource } from '../../.stack-test-runtime/angular/list-query-v2-users/src/list-users.source';
import type { ListUsersInput } from '../../.stack-test-runtime/angular/list-query-v2-users/src/models';

const baseUrl = 'https://settings.example.test/';
const usersUrl = `${baseUrl}settings-and-security/users`;

interface Runtime {
    readonly errorHandler: { readonly handle: ReturnType<typeof vi.fn> };
    readonly facade: ListUsersFacade;
    readonly http: HttpTestingController;
}

function configureRuntime(): Runtime {
    const errorHandler = { handle: vi.fn() };
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(
                withInterceptors([
                    authInterceptor,
                    errorInterceptor,
                    cacheInterceptor,
                ])
            ),
            provideHttpClientTesting(),
            {
                provide: SessionService,
                useValue: { token: signal({ value: 'session-token' }) },
            },
            { provide: SETTINGS_API_URL, useValue: baseUrl },
            { provide: ErrorHandlerRegistry, useValue: errorHandler },
            HttpCacheStore,
            ListUsersSource,
            ListUsersFacade,
        ],
    });
    return {
        errorHandler,
        facade: TestBed.inject(ListUsersFacade),
        http: TestBed.inject(HttpTestingController),
    };
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
            // La page contractuelle est une projection : ces champs Laravel
            // observés ne doivent pas rendre le client dépendant de Laravel.
            first_page_url: `${usersUrl}?page=1`,
            links: [],
            next_page_url: `${usersUrl}?page=3`,
        },
    };
}

async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

describe('list-query v2 Angular — page et query parameters réels', () => {
    it('sérialise les filtres wire, décode la page et tolère ses champs non projetés', async () => {
        const { facade, http } = configureRuntime();

        facade.load({
            page: 2,
            search: 'Awa & Mariam',
            role: 'team-leader',
            isActive: false,
        });
        await settle();

        const request = http.expectOne(
            (candidate) => candidate.url === usersUrl
        );
        expect(request.request.method).toBe('GET');
        expect(request.request.params.keys()).toEqual([
            'page',
            'search',
            'role',
            'is_active',
        ]);
        expect(request.request.params.get('page')).toBe('2');
        expect(request.request.params.get('search')).toBe('Awa & Mariam');
        expect(request.request.params.has('profile')).toBe(false);
        expect(request.request.params.get('role')).toBe('team-leader');
        expect(request.request.params.get('is_active')).toBe('false');
        expect(request.request.urlWithParams).toBe(
            `${usersUrl}?page=2&search=Awa%20%26%20Mariam&role=team-leader&is_active=false`
        );
        expect(request.request.headers.get('Authorization')).toBe(
            'Bearer session-token'
        );
        expect(request.request.context.get(SKIP_AUTH)).toBe(false);
        expect(request.request.context.get(BYPASS_CACHE)).toBe(false);
        request.flush(page());
        await settle();

        expect(facade.items()).toEqual([
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
        expect(facade.page()).toMatchObject({
            currentPage: 2,
            lastPage: 3,
            pageSize: 10,
            totalItems: 21,
        });
        expect(facade.state()).toBe('success');
    });

    it('omet les filtres facultatifs absents et classe une page vide comme vide', async () => {
        const { facade, http } = configureRuntime();

        facade.load({ page: 1 });
        await settle();
        const request = http.expectOne(
            (candidate) => candidate.url === usersUrl
        );
        expect(request.request.params.keys()).toEqual(['page']);
        request.flush(page({ items: [], currentPage: 1 }));
        await settle();

        expect(facade.items()).toEqual([]);
        expect(facade.page()?.totalItems).toBe(21);
        expect(facade.state()).toBe('empty');
    });

    it.each([
        { label: 'page hors borne', input: { page: 0 } },
        { label: 'recherche vide présente', input: { page: 1, search: '' } },
        { label: 'rôle hors contrat', input: { page: 1, role: 'admin' } },
        {
            label: 'booléen de type faux',
            input: { page: 1, isActive: 'false' },
        },
    ])('rejette $label avant tout appel HTTP', async ({ input }) => {
        const { errorHandler, facade, http } = configureRuntime();

        facade.load(input as unknown as ListUsersInput);
        await settle();

        http.expectNone(() => true);
        expect(facade.state()).toBe('error');
        expect(facade.error()).toBeInstanceOf(InvalidPayloadError);
        expect(errorHandler.handle).toHaveBeenCalledWith(
            expect.any(InvalidPayloadError)
        );
    });

    it('rejette une métadonnée de page invalide avec son chemin wire exact', async () => {
        const { errorHandler, facade, http } = configureRuntime();
        facade.load({ page: 1 });
        await settle();

        const payload = page({ currentPage: 1 });
        payload.data.current_page = '1' as unknown as number;
        http.expectOne((candidate) => candidate.url === usersUrl).flush(
            payload
        );
        await settle();

        expect(facade.state()).toBe('error');
        expect(facade.error()).toBeInstanceOf(InvalidPayloadError);
        expect(facade.error()?.message).toContain('$.data.current_page');
        expect(errorHandler.handle).toHaveBeenCalledWith(
            expect.any(InvalidPayloadError)
        );
    });

    it('préserve la page résolue et les paramètres exacts pendant un reload', async () => {
        const { facade, http } = configureRuntime();
        facade.load({ page: 2, profile: 'Administrateur' });
        await settle();
        http.expectOne((candidate) => candidate.url === usersUrl).flush(page());
        await settle();

        facade.reload();
        await settle();
        expect(facade.state()).toBe('reloading');
        expect(facade.items()).toHaveLength(1);
        const refresh = http.expectOne(
            (candidate) => candidate.url === usersUrl
        );
        expect(refresh.request.params.get('page')).toBe('2');
        expect(refresh.request.params.get('profile')).toBe('Administrateur');
        expect(refresh.request.context.get(BYPASS_CACHE)).toBe(true);
        refresh.flush({ error: true, message: 'Reload refusé' });
        await settle();

        expect(facade.state()).toBe('error');
        expect(facade.page()?.currentPage).toBe(2);
        expect(facade.items()).toHaveLength(1);
    });

    it('annule la page précédente lorsqu’un nouvel input la remplace', async () => {
        const { facade, http } = configureRuntime();
        facade.load({ page: 1 });
        await settle();
        const first = http.expectOne((candidate) => candidate.url === usersUrl);

        facade.load({ page: 2 });
        await settle();

        expect(first.cancelled).toBe(true);
        const latest = http.expectOne(
            (candidate) => candidate.url === usersUrl
        );
        expect(latest.request.params.get('page')).toBe('2');
        latest.flush(page());
        await settle();
        expect(facade.page()?.currentPage).toBe(2);
    });
});
