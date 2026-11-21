import {
    HttpClient,
    provideHttpClient,
    withInterceptors,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { type ProviderToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom, type Observable } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import * as observatory from '../../.stack-test-runtime/angular/application-session/observatory/fixture-runtime';
import * as equipment from '../../.stack-test-runtime/angular/application-session/equipment-hire/fixture-runtime';

interface EnterPort {
    submit(input: {
        identity: string;
        passphrase: string;
    }): Observable<unknown>;
    state(): string;
    result(): unknown;
    error():
        | {
              readonly kind: string;
              readonly message: string;
              readonly fields: Readonly<Record<string, readonly string[]>>;
          }
        | undefined;
    reset(): void;
}
type SessionPort = Pick<
    observatory.ApplicationSession,
    keyof observatory.ApplicationSession
>;

interface AgreePort {
    submit(input?: Readonly<Record<string, never>>): Observable<unknown>;
}

interface ActionTestRuntime {
    value: typeof observatory | typeof equipment;
    enterToken: ProviderToken<EnterPort>;
    agreeToken: ProviderToken<AgreePort>;
    sessionToken: ProviderToken<SessionPort>;
}

const runtimes: readonly ActionTestRuntime[] = [
    {
        value: observatory,
        enterToken: observatory.EnterFacade,
        agreeToken: observatory.AgreeFacade,
        sessionToken: observatory.ApplicationSession,
    },
    {
        value: equipment,
        enterToken: equipment.EnterFacade,
        agreeToken: equipment.AgreeFacade,
        sessionToken: equipment.ApplicationSession,
    },
];

for (const {
    value: runtime,
    enterToken,
    agreeToken,
    sessionToken,
} of runtimes) {
    describe(`actions Angular produites : ${runtime.fixture.domain}`, () => {
        function configure() {
            TestBed.configureTestingModule({
                providers: [
                    provideHttpClient(
                        withInterceptors([
                            runtime.applicationSessionInterceptor,
                        ])
                    ),
                    provideHttpClientTesting(),
                    provideRouter(runtime.appRoutes),
                    {
                        provide: runtime.SESSION_ENDPOINTS,
                        useValue: [runtime.fixture.endpoint],
                    },
                    {
                        provide: runtime.APPLICATION_SESSION,
                        useExisting: runtime.ApplicationSession,
                    },
                    runtime.EnterSource,
                    runtime.EnterFacade,
                    runtime.AgreeSource,
                    runtime.AgreeFacade,
                ],
            });
            return {
                facade: TestBed.inject(enterToken),
                session: TestBed.inject(sessionToken),
                http: TestBed.inject(HttpTestingController),
            };
        }
        afterEach(() => {
            TestBed.inject(HttpTestingController).verify();
            TestBed.resetTestingModule();
        });
        it('valide avant HTTP, refuse le double envoi et décode avant état succès', async () => {
            const { facade, http, session } = configure();
            await expect(
                firstValueFrom(
                    facade.submit({ identity: '', passphrase: 'secret' })
                )
            ).rejects.toThrow();
            http.expectNone(
                runtime.fixture.endpoint.base_url +
                    runtime.fixture.operations.enter
            );
            const pending = firstValueFrom(
                facade.submit(runtime.fixture.enterInput)
            );
            const request = http.expectOne(
                runtime.fixture.endpoint.base_url +
                    runtime.fixture.operations.enter
            );
            expect(request.request.body).toEqual(runtime.fixture.enterInput);
            expect(request.request.context.get(runtime.SKIP_AUTH)).toBe(true);
            expect(request.request.headers.has('Authorization')).toBe(false);
            expect(request.request.cache).toBe('no-store');
            expect(request.request.redirect).toBe('error');
            await expect(
                firstValueFrom(facade.submit(runtime.fixture.enterInput))
            ).rejects.toThrow('Une requête est déjà en cours.');
            expect(facade.state()).toBe('submitting');
            request.flush(runtime.fixture.wireResponse);
            await pending;
            expect(facade.state()).toBe('success');
            expect(session.connected()).toBe(false);
        });
        it('normalise 400/401/422, lie les champs déclarés et ne publie aucun corps brut', async () => {
            const { facade, http } = configure();
            for (const status of [400, 401, 422]) {
                const pending = firstValueFrom(
                    facade.submit(runtime.fixture.enterInput)
                );
                const body =
                    status === 422
                        ? {
                              [runtime.fixture.names.message]: 'Correct fields',
                              errors: {
                                  identity: ['Required'],
                                  unknown: ['SENTINEL_PRIVATE_RESPONSE'],
                              },
                          }
                        : status === 400
                          ? {
                                [runtime.fixture.names.message]: 'Rejected',
                                [runtime.fixture.names.error]: true,
                                statusCode: 400,
                            }
                          : { [runtime.fixture.names.message]: 'Reconnect' };
                http.expectOne(
                    runtime.fixture.endpoint.base_url +
                        runtime.fixture.operations.enter
                ).flush(body, { status, statusText: 'Rejected' });
                await expect(pending).rejects.toThrow();
                expect(facade.state()).toBe('error');
                expect(facade.error()?.kind).toBe(
                    status === 422
                        ? 'fields'
                        : status === 401
                          ? 'unauthenticated'
                          : 'request'
                );
                expect(JSON.stringify(facade.error())).not.toContain(
                    'SENTINEL_PRIVATE_RESPONSE'
                );
                if (status === 422)
                    expect(facade.error()?.fields).toEqual({
                        identity: ['Required'],
                    });
            }
        });
        it('reset interdit à une réponse tardive de restaurer résultat ou erreur', async () => {
            const { facade, http } = configure();
            const pending = firstValueFrom(
                facade.submit(runtime.fixture.enterInput)
            );
            const request = http.expectOne(
                runtime.fixture.endpoint.base_url +
                    runtime.fixture.operations.enter
            );
            facade.reset();
            request.flush(runtime.fixture.wireResponse);
            await expect(pending).rejects.toThrow();
            expect(facade.state()).toBe('idle');
            expect(facade.result()).toBeUndefined();
            expect(facade.error()).toBeUndefined();
        });
        it('la commande sans corps réutilise le Bearer uniquement sur son endpoint déclaré', async () => {
            const { http, session } = configure();
            session.establish(
                runtime.SESSION_CONFIGURATION.producer,
                runtime.fixture.sessionResult,
                session.epoch()
            );
            const facade = TestBed.inject(agreeToken);
            const pending = firstValueFrom(facade.submit());
            const request = http.expectOne(
                runtime.fixture.endpoint.base_url +
                    runtime.fixture.operations.agree
            );
            expect(request.request.body).toBeNull();
            expect(request.request.headers.has('Content-Type')).toBe(false);
            expect(request.request.headers.get('Authorization')).toBe(
                'Bearer fixture-token-value'
            );
            expect(request.request.transferCache).toBe(false);
            expect(request.request.credentials).toBe('omit');
            request.flush(runtime.fixture.commandResult);
            await pending;
        });
        // Frontière du Bearer (CI #389, canonicalOperationPath) : il ne part
        // que vers le chemin déclaré exact, versionné compris (`/v1.0/…`).
        it('le Bearer ne part que vers le chemin déclaré exact', () => {
            const { http, session } = configure();
            session.establish(
                runtime.SESSION_CONFIGURATION.producer,
                runtime.fixture.sessionResult,
                session.epoch()
            );
            const client = TestBed.inject(HttpClient);
            const base = runtime.fixture.endpoint.base_url;
            const declared = runtime.fixture.operations.agree;
            const parent = declared.slice(0, declared.lastIndexOf('/'));
            const last = declared.slice(declared.lastIndexOf('/') + 1);
            const bearer = (path: string) => {
                client
                    .post(base + path, null)
                    .subscribe({ error: () => undefined });
                const request = http.expectOne(() => true);
                const header = request.request.headers.get('Authorization');
                request.flush(runtime.fixture.commandResult);
                return header;
            };
            expect(bearer(declared)).toBe('Bearer fixture-token-value');
            expect(bearer(parent || '/')).toBeNull();
            expect(bearer(declared + '/x')).toBeNull();
            expect(bearer(declared + '/../x')).toBeNull();
            // URL brute anormale : refusée avant toute comparaison, même si
            // elle se normalise vers le chemin déclaré.
            for (const anomaly of [
                parent + '/x/../' + last,
                parent + '/./' + last,
                parent + '/x/%2e%2e/' + last,
                parent + '/%2E/' + last,
            ])
                expect(bearer(anomaly), anomaly).toBeNull();
        });
        it('une requête anormale sans jeton ne déclenche pas la gestion du 401', () => {
            const { http, session } = configure();
            session.establish(
                runtime.SESSION_CONFIGURATION.producer,
                runtime.fixture.sessionResult,
                session.epoch()
            );
            const router = TestBed.inject(Router);
            const before = router.url;
            const declared = runtime.fixture.operations.agree;
            const parent = declared.slice(0, declared.lastIndexOf('/'));
            const last = declared.slice(declared.lastIndexOf('/') + 1);
            for (const anomaly of [
                parent + '/x/../' + last,
                parent + '/%2E/' + last,
            ]) {
                TestBed.inject(HttpClient)
                    .post(runtime.fixture.endpoint.base_url + anomaly, null)
                    .subscribe({ error: () => undefined });
                const request = http.expectOne(() => true);
                expect(request.request.headers.has('Authorization')).toBe(
                    false
                );
                request.flush(null, {
                    status: 401,
                    statusText: 'Unauthorized',
                });
            }
            expect(session.connected()).toBe(true);
            expect(router.url).toBe(before);
        });
    });
}
