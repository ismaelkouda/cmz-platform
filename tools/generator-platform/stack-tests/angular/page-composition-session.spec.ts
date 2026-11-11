import { RouterTestingHarness } from '@angular/router/testing';
import { Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { type ProviderToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import * as observatory from '../../.stack-test-runtime/angular/application-session/observatory/fixture-runtime';
import * as equipment from '../../.stack-test-runtime/angular/application-session/equipment-hire/fixture-runtime';

type SessionPort = Pick<
    observatory.ApplicationSession,
    keyof observatory.ApplicationSession
>;
type EnterPort = Pick<
    observatory.EnterComposition,
    keyof observatory.EnterComposition
>;
type AgreePort = Pick<
    observatory.AgreeComposition,
    keyof observatory.AgreeComposition
>;
type RotatePort = Pick<
    observatory.RotateComposition,
    keyof observatory.RotateComposition
>;

interface CompositionTestRuntime {
    value: typeof observatory | typeof equipment;
    enterToken: ProviderToken<EnterPort>;
    agreeToken: ProviderToken<AgreePort>;
    rotateToken: ProviderToken<RotatePort>;
    sessionToken: ProviderToken<SessionPort>;
}

const runtimes: readonly CompositionTestRuntime[] = [
    {
        value: observatory,
        enterToken: observatory.EnterComposition,
        agreeToken: observatory.AgreeComposition,
        rotateToken: observatory.RotateComposition,
        sessionToken: observatory.ApplicationSession,
    },
    {
        value: equipment,
        enterToken: equipment.EnterComposition,
        agreeToken: equipment.AgreeComposition,
        rotateToken: equipment.RotateComposition,
        sessionToken: equipment.ApplicationSession,
    },
];

for (const {
    value: runtime,
    enterToken,
    agreeToken,
    rotateToken,
    sessionToken,
} of runtimes) {
    describe(`composition produite et session : ${runtime.fixture.domain}`, () => {
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
                    ...runtime.ENTER_PROVIDERS,
                    ...runtime.AGREE_PROVIDERS,
                    ...runtime.ROTATE_PROVIDERS,
                ],
            });
            return {
                enter: TestBed.inject(enterToken).enter,
                agree: TestBed.inject(agreeToken).agree,
                rotate: TestBed.inject(rotateToken).rotate,
                session: TestBed.inject(sessionToken),
                http: TestBed.inject(HttpTestingController),
            };
        }
        afterEach(() => {
            TestBed.inject(HttpTestingController).verify();
            TestBed.resetTestingModule();
        });
        it('établit après décodage, ordonne les étapes, acquitte localement puis reconnecte après mot de passe', async () => {
            const { enter, agree, rotate, session, http } = configure();
            const login = firstValueFrom(
                enter.submit(runtime.fixture.enterInput)
            );
            expect(session.connected()).toBe(false);
            http.expectOne(
                runtime.fixture.endpoint.base_url +
                    runtime.fixture.operations.enter
            ).flush(runtime.fixture.wireResponse);
            await expect(login).resolves.toBeUndefined();
            expect(enter.result()).toBeUndefined();
            expect(session.stage()?.id).toBe(
                runtime.SESSION_CONFIGURATION.stages[0].id
            );
            const before = JSON.stringify(runtime.fixture.sessionResult);
            for (const stage of runtime.SESSION_CONFIGURATION.stages) {
                if (!session.connected()) {
                    const result: Record<string, unknown> = structuredClone(
                        runtime.fixture.sessionResult
                    );
                    (
                        result[runtime.fixture.names.subject] as Record<
                            string,
                            unknown
                        >
                    )[runtime.fixture.names.rotate] = false;
                    const reconnect = firstValueFrom(
                        enter.submit(runtime.fixture.enterInput)
                    );
                    http.expectOne(
                        runtime.fixture.endpoint.base_url +
                            runtime.fixture.operations.enter
                    ).flush(result);
                    await reconnect;
                }
                expect(session.stage()?.id).toBe(stage.id);
                const pending =
                    stage.id === 'review'
                        ? firstValueFrom(agree.submit({}))
                        : firstValueFrom(
                              rotate.submit({
                                  current_secret: 'old',
                                  next_secret: 'new',
                                  confirmation: 'new',
                              })
                          );
                http.expectOne(
                    runtime.fixture.endpoint.base_url +
                        (stage.id === 'review'
                            ? runtime.fixture.operations.agree
                            : runtime.fixture.operations.rotate)
                ).flush(runtime.fixture.commandResult);
                await pending;
                if (stage.completion.effect === 'clear-and-reconnect') {
                    expect(session.connected()).toBe(false);
                    expect(session.menu()).toEqual([]);
                    expect(session.nextPath()).toBe('/enter');
                }
            }
            expect(JSON.stringify(runtime.fixture.sessionResult)).toBe(before);
        });
        it('200 de challenge ou enveloppe malformée ne devient jamais une session', async () => {
            const { enter, session, http } = configure();
            for (const payload of [
                { challenge: true },
                { SENTINEL_PRIVATE_RESPONSE: true },
            ]) {
                const pending = firstValueFrom(
                    enter.submit(runtime.fixture.enterInput)
                );
                const wire =
                    runtime.fixture.domain === 'observatory'
                        ? { error: false, message: 'OK', payload }
                        : payload;
                http.expectOne(
                    runtime.fixture.endpoint.base_url +
                        runtime.fixture.operations.enter
                ).flush(wire);
                await expect(pending).rejects.toThrow();
                expect(session.connected()).toBe(false);
                expect(enter.state()).toBe('error');
                expect(JSON.stringify(enter.error())).not.toContain(
                    'SENTINEL_PRIVATE_RESPONSE'
                );
            }
        });
        it('400 ne termine pas l’étape et 422 reste lié au formulaire', async () => {
            const { enter, rotate, session, http } = configure();
            const login = firstValueFrom(
                enter.submit(runtime.fixture.enterInput)
            );
            http.expectOne(
                runtime.fixture.endpoint.base_url +
                    runtime.fixture.operations.enter
            ).flush(runtime.fixture.wireResponse);
            await login;
            const review = runtime.SESSION_CONFIGURATION.stages.find(
                (stage) => stage.id === 'review'
            );
            expect(review).toBeDefined();
            if (!review) throw new Error('Missing review stage');
            if (session.stage()?.id === 'review')
                session.complete(
                    review.id,
                    review.completion.producer,
                    runtime.fixture.commandResult,
                    session.epoch()
                );
            for (const status of [400, 422]) {
                const pending = firstValueFrom(
                    rotate.submit({
                        current_secret: 'old',
                        next_secret: 'new',
                        confirmation: 'new',
                    })
                );
                const body =
                    status === 400
                        ? {
                              [runtime.fixture.names.message]:
                                  'Wrong old credential',
                              [runtime.fixture.names.error]: true,
                              statusCode: 400,
                          }
                        : {
                              [runtime.fixture.names.message]: 'Invalid',
                              errors: { next_secret: ['Too weak'] },
                          };
                http.expectOne(
                    runtime.fixture.endpoint.base_url +
                        runtime.fixture.operations.rotate
                ).flush(body, { status, statusText: 'Rejected' });
                await expect(pending).rejects.toThrow();
                expect(session.connected()).toBe(true);
                expect(session.stage()?.id).toBe('renew');
                if (status === 422)
                    expect(rotate.fieldErrors()).toEqual({
                        next_secret: ['Too weak'],
                    });
            }
        });
        it('RouterTestingHarness consomme les gardes produites et refuse l’accès direct anonyme', async () => {
            configure();
            const harness = await RouterTestingHarness.create('/catalogue');
            expect(harness.routeNativeElement?.textContent).toContain('enter');
            expect(TestBed.inject(Router).url).toBe('/enter');
        });
        it('la déconnexion pendant la requête empêche la connexion tardive', async () => {
            const { enter, session, http } = configure();
            const pending = firstValueFrom(
                enter.submit(runtime.fixture.enterInput)
            );
            session.clear();
            http.expectOne(
                runtime.fixture.endpoint.base_url +
                    runtime.fixture.operations.enter
            ).flush(runtime.fixture.wireResponse);
            await expect(pending).rejects.toThrow();
            expect(session.connected()).toBe(false);
            expect(enter.result()).toBeUndefined();
        });
    });
}
