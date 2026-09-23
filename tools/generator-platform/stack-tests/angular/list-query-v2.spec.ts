import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
    EnvironmentInjector,
    createEnvironmentInjector,
    signal,
} from '@angular/core';
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
import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from '../../../../apps/backoffice-angular/src/app/interceptors/auth.interceptor';
import { ListSiteGroupsFacade } from '../../.stack-test-runtime/angular/list-query-v2/src/list-site-groups.facade';
import { ListSiteGroupsSource } from '../../.stack-test-runtime/angular/list-query-v2/src/list-site-groups.source';
import { ListHomeBlockInfosSource } from '../../.stack-test-runtime/angular/list-query-v2-public/src/list-home-block-infos.source';

const baseUrl = 'https://settings.example.test/';
const siteGroupsUrl = `${baseUrl}infrastructures/site-groups`;

interface Runtime {
    readonly errorHandler: { readonly handle: ReturnType<typeof vi.fn> };
    readonly facade: ListSiteGroupsFacade;
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
            ListSiteGroupsSource,
            ListSiteGroupsFacade,
            ListHomeBlockInfosSource,
        ],
    });
    return {
        errorHandler,
        facade: TestBed.inject(ListSiteGroupsFacade),
        http: TestBed.inject(HttpTestingController),
    };
}

async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The HTTP response first settles `rxResource`; its error-routing effect is
    // scheduled in the following Angular stabilization turn.
    await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

describe('list-query v2 Angular — oracle host réel', () => {
    it('exécute le cas actif site-group-select, puis mappe DTO wire vers read model', async () => {
        const { facade, http } = configureRuntime();
        expect(facade.state()).toBe('idle');

        facade.load();
        await settle();
        expect(facade.state()).toBe('loading');

        const request = http.expectOne(siteGroupsUrl);
        expect(request.request.method).toBe('GET');
        expect(request.request.headers.get('Authorization')).toBe(
            'Bearer session-token'
        );
        expect(request.request.context.get(SKIP_AUTH)).toBe(false);
        expect(request.request.context.get(BYPASS_CACHE)).toBe(false);
        request.flush({
            error: false,
            message: 'OK',
            data: [
                {
                    id: 'group-1',
                    name: 'Groupe principal',
                    description: 'Wire only',
                },
            ],
        });
        await settle();

        expect(facade.items()).toEqual([
            { value: 'group-1', label: 'Groupe principal' },
        ]);
        expect(facade.state()).toBe('success');
    });

    it('préserve la valeur pendant reload et contourne réellement le cache du host', async () => {
        const { facade, http } = configureRuntime();
        facade.load();
        await settle();
        http.expectOne(siteGroupsUrl).flush({
            error: false,
            message: 'OK',
            data: [{ id: 'stale', name: 'Ancien', description: 'Wire only' }],
        });
        await settle();

        facade.reload();
        await settle();
        expect(facade.state()).toBe('reloading');
        expect(facade.items()).toEqual([{ value: 'stale', label: 'Ancien' }]);
        const refresh = http.expectOne(siteGroupsUrl);
        expect(refresh.request.context.get(BYPASS_CACHE)).toBe(true);
        refresh.flush({
            error: false,
            message: 'OK',
            data: [{ id: 'fresh', name: 'Nouveau', description: 'Wire only' }],
        });
        await settle();

        expect(facade.items()).toEqual([{ value: 'fresh', label: 'Nouveau' }]);
        expect(facade.state()).toBe('success');
    });

    it('rejette un type wire faux avant le domaine et conserve une erreur identifiable', async () => {
        const { errorHandler, facade, http } = configureRuntime();
        facade.load({ forceRefresh: true });
        await settle();
        http.expectOne(siteGroupsUrl).flush({
            error: false,
            message: 'OK',
            data: [{ id: 42, name: 'Invalide', description: 'Wire only' }],
        });
        await settle();

        expect(facade.state()).toBe('error');
        expect(facade.error()).toBeInstanceOf(InvalidPayloadError);
        expect(errorHandler.handle).toHaveBeenCalledWith(
            expect.any(InvalidPayloadError)
        );
    });

    it('propage une erreur applicative comme DomainError sans perdre le message serveur', async () => {
        const { errorHandler, facade, http } = configureRuntime();
        facade.load({ forceRefresh: true });
        await settle();
        http.expectOne(siteGroupsUrl).flush({
            error: true,
            message: 'Accès métier refusé',
        });
        await settle();

        expect(facade.error()).toBeInstanceOf(ServerResponseError);
        expect(facade.error()?.message).toBe('Accès métier refusé');
        expect(errorHandler.handle).toHaveBeenCalledWith(
            expect.any(ServerResponseError)
        );
    });

    it('laisse le vrai intercepteur convertir une erreur HTTP sans perdre le message serveur', async () => {
        const { errorHandler, facade, http } = configureRuntime();
        facade.load();
        await settle();
        http.expectOne(siteGroupsUrl).flush(
            { message: 'Backend indisponible' },
            { status: 503, statusText: 'Service Unavailable' }
        );
        await settle();

        expect(facade.error()).toBeInstanceOf(ServerResponseError);
        expect(facade.error()?.message).toBe('Backend indisponible');
        expect(errorHandler.handle).toHaveBeenCalledWith(
            expect.any(ServerResponseError)
        );
    });

    it('préserve la dernière valeur résolue si un reload échoue', async () => {
        const { facade, http } = configureRuntime();
        facade.load();
        await settle();
        http.expectOne(siteGroupsUrl).flush({
            error: false,
            message: 'OK',
            data: [{ id: 'stale', name: 'Conservé', description: 'Wire only' }],
        });
        await settle();

        facade.reload();
        await settle();
        http.expectOne(siteGroupsUrl).flush({
            error: true,
            message: 'Reload refusé',
        });
        await settle();

        expect(facade.state()).toBe('error');
        expect(facade.items()).toEqual([{ value: 'stale', label: 'Conservé' }]);
    });

    it('annule la requête précédente quand un nouveau load la supplante', async () => {
        const { facade, http } = configureRuntime();
        facade.load();
        await settle();
        const first = http.expectOne(siteGroupsUrl);

        facade.load({ forceRefresh: true });
        await settle();
        expect(first.cancelled).toBe(true);
        const latest = http.expectOne(siteGroupsUrl);
        expect(latest.request.context.get(BYPASS_CACHE)).toBe(true);
        latest.flush({ error: false, message: 'OK', data: [] });
        await settle();

        expect(facade.state()).toBe('empty');
        expect(facade.items()).toEqual([]);
    });

    it('annule la requête en vol quand le contexte Angular est détruit', async () => {
        const { http } = configureRuntime();
        const child = createEnvironmentInjector(
            [ListSiteGroupsSource, ListSiteGroupsFacade],
            TestBed.inject(EnvironmentInjector)
        );
        const facade = child.get(ListSiteGroupsFacade);

        facade.load();
        await settle();
        const request = http.expectOne(siteGroupsUrl);
        child.destroy();

        expect(request.cancelled).toBe(true);
    });

    it('une query publique générée ne transporte jamais le Bearer du host', async () => {
        const { http } = configureRuntime();
        const source = TestBed.inject(ListHomeBlockInfosSource);
        const result = firstValueFrom(source.readAll(false));

        const request = http.expectOne(
            `${baseUrl}cms/home-block-infos/actives/pwa`
        );
        expect(request.request.context.get(SKIP_AUTH)).toBe(true);
        expect(request.request.headers.has('Authorization')).toBe(false);
        request.flush({
            error: false,
            message: 'OK',
            data: [{ id: 1, title: 'Accueil' }],
        });

        await expect(result).resolves.toEqual([{ id: 1, title: 'Accueil' }]);
    });
});
