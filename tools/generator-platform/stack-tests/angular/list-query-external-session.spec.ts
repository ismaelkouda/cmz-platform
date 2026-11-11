// X5 C2 : lecture de session au profil extérieur, sur les deux produits de
// session (jsdom, sans claim navigateur). D-X5-2 : décodeur projeté.
// D-X5-4 : aucune mise en cache, `no-store`. D-X5-6 : un échec efface les
// lignes, et aucune ligne périmée ne revient pendant la relecture.
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { type ProviderToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import * as observatory from '../../.stack-test-runtime/angular/application-session/observatory/fixture-runtime';
import * as equipment from '../../.stack-test-runtime/angular/application-session/equipment-hire/fixture-runtime';

type SessionPort = Pick<
    observatory.ApplicationSession,
    keyof observatory.ApplicationSession
>;
interface CataloguePort {
    readonly catalogue: {
        load(): void;
        reload(): void;
        items(): readonly unknown[];
        state(): string;
        error(): { readonly statusCode: number } | undefined;
    };
}

for (const runtime of [observatory, equipment]) {
    describe(`lecture de session au profil extérieur : ${runtime.fixture.domain}`, () => {
        const url =
            runtime.fixture.endpoint.base_url +
            runtime.fixture.operations.catalogue;
        const envelope = (data: unknown) => ({
            [runtime.fixture.names.error]: false,
            [runtime.fixture.names.message]: 'OK',
            data,
        });
        const row = {
            id: '5d1565bc-9afd-4f8c-b186-709b887b985c',
            label: 'Observed fixture row',
        };

        function configure(
            endpoints: readonly unknown[] = [runtime.fixture.endpoint]
        ) {
            TestBed.configureTestingModule({
                providers: [
                    provideHttpClient(
                        withInterceptors([
                            runtime.applicationSessionInterceptor,
                        ])
                    ),
                    provideHttpClientTesting(),
                    {
                        provide: runtime.SESSION_ENDPOINTS,
                        useValue: endpoints,
                    },
                    {
                        provide: runtime.APPLICATION_SESSION,
                        useExisting: runtime.ApplicationSession,
                    },
                    ...runtime.CATALOGUE_PROVIDERS,
                ],
            });
            const session = TestBed.inject(
                runtime.ApplicationSession as ProviderToken<SessionPort>
            );
            session.establish(
                runtime.SESSION_CONFIGURATION.producer,
                runtime.fixture.sessionResult,
                session.epoch()
            );
            const page = TestBed.inject(
                runtime.CatalogueComposition as ProviderToken<CataloguePort>
            );
            return {
                facade: page.catalogue,
                http: TestBed.inject(HttpTestingController),
            };
        }
        const settle = async () => {
            TestBed.tick();
            await new Promise((resolve) => setTimeout(resolve));
            TestBed.tick();
        };

        afterEach(() => {
            TestBed.inject(HttpTestingController).verify();
            TestBed.resetTestingModule();
        });

        it('deux lectures non forcées envoient deux requêtes no-store ; un champ non lu est ignoré', async () => {
            const { facade, http } = configure();
            for (let attempt = 0; attempt < 2; attempt++) {
                facade.load();
                await settle();
                const request = http.expectOne(url);
                expect(request.request.cache).toBe('no-store');
                request.flush(
                    envelope([
                        {
                            ...row,
                            unread_nested: { flag: true },
                            unread_active: true,
                        },
                    ])
                );
                await settle();
                expect(facade.state()).toBe('success');
                expect(facade.items()).toEqual([row]);
            }
        });

        it('un champ lu invalide est refusé, sans ligne', async () => {
            const { facade, http } = configure();
            facade.load();
            await settle();
            http.expectOne(url).flush(envelope([{ ...row, label: 42 }]));
            await settle();
            expect(facade.state()).toBe('error');
            expect(facade.items()).toEqual([]);
        });

        it('un échec efface les lignes ; aucune ligne périmée pendant la relecture', async () => {
            const { facade, http } = configure();
            facade.load();
            await settle();
            http.expectOne(url).flush(envelope([row]));
            await settle();
            expect(facade.items()).toEqual([row]);
            facade.reload();
            await settle();
            // Rechargement : les lignes restent visibles (on_reload preserve).
            expect(facade.state()).toBe('reloading');
            expect(facade.items()).toEqual([row]);
            http.expectOne(url).flush(
                {},
                { status: 500, statusText: 'Server Error' }
            );
            await settle();
            expect(facade.state()).toBe('error');
            expect(facade.error()?.statusCode).toBe(500);
            expect(facade.items()).toEqual([]);
            facade.reload();
            await settle();
            expect(facade.items()).toEqual([]);
            http.expectOne(url).flush(envelope([row]));
            await settle();
            expect(facade.items()).toEqual([row]);
        });

        it('hors ligne : statut 0, état d’erreur, aucune ligne', async () => {
            const { facade, http } = configure();
            facade.load();
            await settle();
            http.expectOne(url).flush(envelope([row]));
            await settle();
            facade.load();
            await settle();
            http.expectOne(url).error(new ProgressEvent('error'));
            await settle();
            expect(facade.state()).toBe('error');
            expect(facade.error()?.statusCode).toBe(0);
            expect(facade.items()).toEqual([]);
        });

        // X4-sécurité-3 G3 (C3a) : adresse résolue à l'exécution. Sans
        // adresse déclarée, la page se construit, la lecture échoue en statut
        // 0 et aucune requête ne part.
        it('adresse de service absente : page construite, statut 0, aucune requête', async () => {
            const { facade, http } = configure([]);
            facade.load();
            await settle();
            http.expectNone(() => true);
            expect(facade.state()).toBe('error');
            expect(facade.error()?.statusCode).toBe(0);
            expect(facade.items()).toEqual([]);
        });
    });
}
