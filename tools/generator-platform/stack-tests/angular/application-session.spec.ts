import {
    HttpClient,
    provideHttpClient,
    withInterceptors,
} from '@angular/common/http';
import {
    HttpTestingController,
    type TestRequest,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { type ProviderToken, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import * as observatory from '../../.stack-test-runtime/angular/application-session/observatory/fixture-runtime';
import * as equipment from '../../.stack-test-runtime/angular/application-session/equipment-hire/fixture-runtime';

type SessionPort = Pick<
    observatory.ApplicationSession,
    keyof observatory.ApplicationSession
>;
type FlushBody = Parameters<TestRequest['flush']>[0];

interface ApplicationTestRuntime {
    value: typeof observatory | typeof equipment;
    appType: Type<unknown>;
    sessionToken: ProviderToken<SessionPort>;
    fixture: { readonly wireResponse: FlushBody };
}

const runtimes: readonly ApplicationTestRuntime[] = [
    {
        value: observatory,
        appType: observatory.App,
        sessionToken: observatory.ApplicationSession,
        fixture: observatory.fixture,
    },
    {
        value: equipment,
        appType: equipment.App,
        sessionToken: equipment.ApplicationSession,
        fixture: equipment.fixture,
    },
];

for (const { value: runtime, appType, sessionToken, fixture } of runtimes) {
    describe(`coque Angular produite (jsdom, sans claim navigateur) : ${runtime.fixture.domain}`, () => {
        function configure() {
            TestBed.configureTestingModule({
                imports: [runtime.App],
                providers: [
                    provideHttpClient(
                        withInterceptors([
                            runtime.applicationSessionInterceptor,
                        ])
                    ),
                    provideHttpClientTesting(),
                    provideRouter(runtime.consumedRoutes),
                    {
                        provide: runtime.SESSION_ENDPOINTS,
                        useValue: [runtime.fixture.endpoint],
                    },
                    {
                        provide: runtime.APPLICATION_SESSION,
                        useExisting: runtime.ApplicationSession,
                    },
                ],
            });
            const component = TestBed.createComponent(appType);
            component.detectChanges();
            return {
                component,
                session: TestBed.inject(sessionToken),
                router: TestBed.inject(Router),
                http: TestBed.inject(HttpTestingController),
                client: TestBed.inject(HttpClient),
            };
        }
        afterEach(() => {
            TestBed.inject(HttpTestingController).verify();
            TestBed.resetTestingModule();
        });
        it('les vraies gardes redirigent sans session et respectent les étapes ordonnées', async () => {
            const { component, session, router } = configure();
            await router.navigateByUrl('/catalogue');
            expect(router.url).toBe('/enter');
            expect(
                component.nativeElement.querySelector('main#app-main')
            ).not.toBeNull();
            expect(
                component.nativeElement
                    .querySelector('a.skip')
                    .getAttribute('href')
            ).toBe('#app-main');
            session.establish(
                runtime.SESSION_CONFIGURATION.producer,
                runtime.fixture.sessionResult,
                session.epoch()
            );
            await router.navigateByUrl('/catalogue');
            expect(router.url).toBe(
                runtime.fixture.domain === 'observatory' ? '/agree' : '/rotate'
            );
            const stage = runtime.SESSION_CONFIGURATION.stages[0];
            session.complete(
                stage.id,
                stage.completion.producer,
                runtime.fixture.commandResult,
                session.epoch()
            );
            await router.navigateByUrl('/catalogue');
            expect(router.url).toBe(
                runtime.fixture.domain === 'observatory' ? '/rotate' : '/enter'
            );
        });
        it('menu filtré, clavier Escape, focus rendu et déconnexion dans la coque réelle', async () => {
            const { component, session, router } = configure();
            const result: Record<string, unknown> = structuredClone(
                runtime.fixture.sessionResult
            );
            const subject = result[runtime.fixture.names.subject] as Record<
                string,
                unknown
            >;
            (subject[runtime.fixture.names.privacy] as Record<string, unknown>)[
                runtime.fixture.names.accepted
            ] = 'server-date';
            subject[runtime.fixture.names.rotate] = false;
            session.establish(
                runtime.SESSION_CONFIGURATION.producer,
                result,
                session.epoch()
            );
            await router.navigateByUrl('/dashboard');
            component.detectChanges();
            await component.whenStable();
            const root = component.nativeElement as HTMLElement;
            expect(
                [...root.querySelectorAll('nav a')].map((link) =>
                    link.getAttribute('href')
                )
            ).toEqual(['/catalogue']);
            expect(root.textContent).not.toContain('Restricted');
            const toggle =
                root.querySelector<HTMLButtonElement>('#navigation-toggle');
            expect(toggle).not.toBeNull();
            if (!toggle) throw new Error('Missing navigation toggle');
            toggle.click();
            component.detectChanges();
            expect(toggle.getAttribute('aria-expanded')).toBe('true');
            const navigation = root.querySelector('nav');
            expect(navigation).not.toBeNull();
            if (!navigation) throw new Error('Missing navigation');
            navigation.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
            );
            component.detectChanges();
            expect(toggle.getAttribute('aria-expanded')).toBe('false');
            expect(document.activeElement).toBe(toggle);
            const logout = [...root.querySelectorAll('button')].find((button) =>
                button.textContent?.includes('Se déconnecter')
            );
            expect(logout).toBeDefined();
            if (!logout) throw new Error('Missing logout button');
            logout.click();
            await component.whenStable();
            component.detectChanges();
            expect(session.connected()).toBe(false);
            expect(router.url).toBe('/enter');
            expect(root.querySelector('nav')).toBeNull();
        });
        it('Bearer borné, 403 conservé, 401 courant effacé une fois et réponses anciennes ignorées', async () => {
            const { session, http, client } = configure();
            session.establish(
                runtime.SESSION_CONFIGURATION.producer,
                runtime.fixture.sessionResult,
                session.epoch()
            );
            const url = runtime.fixture.endpoint.base_url + '/items';
            const forbidden = firstValueFrom(client.get(url));
            http.expectOne(url).flush(
                {},
                { status: 403, statusText: 'Forbidden' }
            );
            await expect(forbidden).rejects.toThrow();
            expect(session.connected()).toBe(true);
            const old = firstValueFrom(client.get(url));
            const fresh = firstValueFrom(client.get(url));
            const requests = http.match(url);
            for (const request of requests) {
                expect(request.request.headers.get('Authorization')).toBe(
                    'Bearer fixture-token-value'
                );
                expect(request.request.redirect).toBe('error');
                expect(request.request.cache).toBe('no-store');
            }
            const epoch = session.epoch();
            requests[1].flush({}, { status: 401, statusText: 'Unauthorized' });
            await expect(fresh).rejects.toThrow();
            expect(session.epoch()).toBe(epoch + 1);
            requests[0].flush({ secret: 'SENTINEL_PRIVATE_RESPONSE' });
            await expect(old).rejects.toThrow(
                'La session ne peut pas être utilisée.'
            );
            expect(session.epoch()).toBe(epoch + 1);
            const external = firstValueFrom(
                client.get('https://other.example/api/items')
            );
            const request = http.expectOne('https://other.example/api/items');
            expect(request.request.headers.has('Authorization')).toBe(false);
            request.flush([]);
            await external;
        });
        it('parcours DOM consommé : formulaires, reconnexion, tableau de bord puis vraie composition catalogue', async () => {
            const { component, router, http, session } = configure();
            const root = component.nativeElement as HTMLElement;
            const send = (values: Readonly<Record<string, string>>) => {
                component.detectChanges();
                for (const [name, value] of Object.entries(values)) {
                    const input = root.querySelector<HTMLInputElement>(
                        `input[name="${name}"]`
                    );
                    expect(input).not.toBeNull();
                    if (!input) throw new Error('Missing input control');
                    input.value = value;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                const form = root.querySelector('form');
                expect(form).not.toBeNull();
                if (!form) throw new Error('Missing form');
                form.dispatchEvent(
                    new Event('submit', { bubbles: true, cancelable: true })
                );
            };
            const login = async (wire: FlushBody) => {
                await router.navigateByUrl('/enter');
                component.detectChanges();
                send(runtime.fixture.enterInput);
                expect(session.connected()).toBe(false);
                http.expectOne(
                    runtime.fixture.endpoint.base_url + '/access'
                ).flush(wire);
                await component.whenStable();
                component.detectChanges();
            };
            await login(fixture.wireResponse);
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
                    await login(result);
                }
                expect(session.stage()?.id).toBe(stage.id);
                send(
                    stage.id === 'review'
                        ? {}
                        : {
                              current_secret: 'old',
                              next_secret: 'new',
                              confirmation: 'new',
                          }
                );
                const request = http.expectOne(
                    runtime.fixture.endpoint.base_url +
                        (stage.id === 'review' ? '/consents' : '/credentials')
                );
                request.flush(runtime.fixture.commandResult);
                await component.whenStable();
                component.detectChanges();
                if (stage.id === 'renew')
                    expect(session.connected()).toBe(false);
            }
            session.clear();
            const final: Record<string, unknown> = structuredClone(
                runtime.fixture.sessionResult
            );
            const subject = final[runtime.fixture.names.subject] as Record<
                string,
                unknown
            >;
            subject[runtime.fixture.names.rotate] = false;
            (subject[runtime.fixture.names.privacy] as Record<string, unknown>)[
                runtime.fixture.names.accepted
            ] = 'server-date';
            await login(
                runtime.fixture.domain === 'observatory'
                    ? { error: false, message: 'OK', payload: final }
                    : final
            );
            expect(router.url).toBe('/dashboard');
            expect(root.textContent).not.toContain('fixture-token-value');
            await router.navigateByUrl('/catalogue');
            component.detectChanges();
            TestBed.tick();
            const request = http.expectOne(
                runtime.fixture.endpoint.base_url + '/items'
            );
            expect(request.request.headers.get('Authorization')).toBe(
                'Bearer fixture-token-value'
            );
            request.flush({
                [runtime.fixture.names.error]: false,
                [runtime.fixture.names.message]: 'OK',
                data: [
                    {
                        id: '5d1565bc-9afd-4f8c-b186-709b887b985c',
                        label: 'Observed fixture row',
                    },
                ],
            });
            await component.whenStable();
            component.detectChanges();
            expect(root.textContent).toContain('Observed fixture row');
        });
        it('une nouvelle injection ne récupère aucun jeton après un rechargement', () => {
            const { session } = configure();
            expect(session.connected()).toBe(false);
            expect(session.nextPath()).toBe('/enter');
            expect(runtime.fixture.networkVerified).toBe(false);
        });
    });
}
