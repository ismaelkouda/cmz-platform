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
    AUTH_API_URL,
    BYPASS_CACHE,
    HttpCacheStore,
    REPORT_API_URL,
    SETTINGS_API_URL,
    SKIP_AUTH,
    cacheInterceptor,
} from '@cmz/core';
import { ErrorHandlerRegistry, SessionService } from '@cmz/shared-application';
import { errorInterceptor } from '@cmz/shared-data';
import { ServerResponseError } from '@cmz/shared-domain';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from '../../../../apps/backoffice-angular/src/app/interceptors/auth.interceptor';
import { PageComposition } from '../../.stack-test-runtime/angular/page-composition-v2/src/page-composition';
import { PAGE_COMPOSITION_PROVIDERS } from '../../.stack-test-runtime/angular/page-composition-v2/src/page-composition.providers';

const authBaseUrl = 'https://auth.example.test/';
const reportBaseUrl = 'https://report.example.test/';
const settingsBaseUrl = 'https://settings.example.test/';
const forgotPasswordUrl = `${authBaseUrl}forgot-password`;
const siteGroupsUrl = `${settingsBaseUrl}infrastructures/site-groups`;
const reportTypesUrl = (reportId: string) =>
    `${reportBaseUrl}processing-actions/${reportId}/report-types`;

interface Runtime {
    readonly composition: PageComposition;
    readonly errorHandler: { readonly handle: ReturnType<typeof vi.fn> };
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
            { provide: AUTH_API_URL, useValue: authBaseUrl },
            { provide: REPORT_API_URL, useValue: reportBaseUrl },
            { provide: SETTINGS_API_URL, useValue: settingsBaseUrl },
            { provide: ErrorHandlerRegistry, useValue: errorHandler },
            HttpCacheStore,
            ...PAGE_COMPOSITION_PROVIDERS,
        ],
    });
    return {
        composition: TestBed.inject(PageComposition),
        errorHandler,
        http: TestBed.inject(HttpTestingController),
    };
}

async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

function flushSiteGroups(
    request: ReturnType<HttpTestingController['expectOne']>
): void {
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
}

function flushReportTypes(
    request: ReturnType<HttpTestingController['expectOne']>
): void {
    request.flush({
        error: false,
        message: 'OK',
        data: [
            {
                code: 'contact-customer',
                name: 'Contacter le client',
                operators: ['mtn', 'orange'],
            },
        ],
    });
}

afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

describe('page composition v2 Angular — oracle externe hermétique', () => {
    it('observe les GET, le POST et le rafraîchissement ciblé avec les politiques exactes du host', async () => {
        const { composition, http } = configureRuntime();

        composition.loadSiteGroups.load();
        composition.loadReportTypes.load({ reportUniqId: 'report/équipe A' });
        await settle();

        const siteGroups = http.expectOne(siteGroupsUrl);
        const reportTypes = http.expectOne(
            reportTypesUrl('report%2F%C3%A9quipe%20A')
        );
        for (const request of [siteGroups, reportTypes]) {
            expect(request.request.method).toBe('GET');
            expect(request.request.headers.get('Authorization')).toBe(
                'Bearer session-token'
            );
            expect(request.request.context.get(SKIP_AUTH)).toBe(false);
            expect(request.request.context.get(BYPASS_CACHE)).toBe(false);
        }
        flushSiteGroups(siteGroups);
        flushReportTypes(reportTypes);
        await settle();

        const submission = firstValueFrom(
            composition.submitPasswordRecovery.submit({
                email: 'person@example.com',
            })
        );
        const command = http.expectOne(forgotPasswordUrl);
        expect(command.request.method).toBe('POST');
        expect(command.request.body).toEqual({ email: 'person@example.com' });
        expect(command.request.context.get(SKIP_AUTH)).toBe(true);
        expect(command.request.headers.has('Authorization')).toBe(false);
        expect(command.request.headers.has('Idempotency-Key')).toBe(false);
        command.flush({
            error: false,
            message: 'OK',
            data: { message: 'Reset instructions sent.' },
        });

        await expect(submission).resolves.toEqual({
            message: 'Reset instructions sent.',
        });
        await settle();
        const refresh = http.expectOne(siteGroupsUrl);
        expect(refresh.request.context.get(BYPASS_CACHE)).toBe(true);
        expect(composition.loadSiteGroups.state()).toBe('reloading');
        http.expectNone((candidate) => candidate.url.startsWith(reportBaseUrl));
        flushSiteGroups(refresh);
        await settle();
        expect(composition.loadSiteGroups.state()).toBe('success');
        expect(composition.loadReportTypes.state()).toBe('success');
        expect(composition.submitPasswordRecovery.state()).toBe('success');
        expect(composition.loadSiteGroups.items()).toEqual([
            { value: 'group-1', label: 'Groupe principal' },
        ]);
        expect(composition.loadReportTypes.items()).toEqual([
            {
                value: 'contact-customer',
                label: 'Contacter le client',
                operators: ['mtn', 'orange'],
            },
        ]);
        http.expectNone((request) => request.method === 'GET');
    });

    it('isole une panne partielle puis rejoue uniquement la query en erreur', async () => {
        const { composition, errorHandler, http } = configureRuntime();

        composition.loadSiteGroups.load();
        composition.loadReportTypes.load({ reportUniqId: 'report-1' });
        await settle();
        flushSiteGroups(http.expectOne(siteGroupsUrl));
        http.expectOne(reportTypesUrl('report-1')).flush(
            { message: 'Report backend unavailable.' },
            { status: 503, statusText: 'Unavailable' }
        );
        await settle();

        expect(composition.loadSiteGroups.state()).toBe('success');
        expect(composition.loadSiteGroups.items()).toEqual([
            { value: 'group-1', label: 'Groupe principal' },
        ]);
        expect(composition.loadReportTypes.state()).toBe('error');
        expect(composition.loadReportTypes.error()).toBeInstanceOf(
            ServerResponseError
        );
        expect(errorHandler.handle).toHaveBeenCalledWith(
            expect.any(ServerResponseError)
        );

        composition.loadReportTypes.reload();
        await settle();
        const retry = http.expectOne(reportTypesUrl('report-1'));
        expect(retry.request.context.get(BYPASS_CACHE)).toBe(true);
        http.expectNone(siteGroupsUrl);
        flushReportTypes(retry);
        await settle();

        expect(composition.loadReportTypes.state()).toBe('success');
        expect(composition.loadSiteGroups.state()).toBe('success');
    });

    it('annule seulement la query paramétrée supplantée', async () => {
        const { composition, http } = configureRuntime();

        composition.loadSiteGroups.load();
        composition.loadReportTypes.load({ reportUniqId: 'report-1' });
        await settle();
        const healthy = http.expectOne(siteGroupsUrl);
        const stale = http.expectOne(reportTypesUrl('report-1'));

        composition.loadReportTypes.load({ reportUniqId: 'report-2' });
        await settle();

        expect(stale.cancelled).toBe(true);
        expect(healthy.cancelled).toBe(false);
        const latest = http.expectOne(reportTypesUrl('report-2'));
        flushSiteGroups(healthy);
        flushReportTypes(latest);
        await settle();

        expect(composition.loadSiteGroups.state()).toBe('success');
        expect(composition.loadReportTypes.state()).toBe('success');
    });

    it('annule les deux GET quand le scope de page est détruit', async () => {
        const { http } = configureRuntime();
        const pageScope = createEnvironmentInjector(
            [...PAGE_COMPOSITION_PROVIDERS],
            TestBed.inject(EnvironmentInjector)
        );
        const composition = pageScope.get(PageComposition);

        composition.loadSiteGroups.load();
        composition.loadReportTypes.load({ reportUniqId: 'report-1' });
        await settle();
        const siteGroups = http.expectOne(siteGroupsUrl);
        const reportTypes = http.expectOne(reportTypesUrl('report-1'));

        pageScope.destroy();

        expect(siteGroups.cancelled).toBe(true);
        expect(reportTypes.cancelled).toBe(true);
    });

    it('invalide seulement la query nommée après le succès distant', async () => {
        const { composition, http } = configureRuntime();

        composition.loadSiteGroups.load();
        await settle();
        flushSiteGroups(http.expectOne(siteGroupsUrl));
        await settle();

        const submitted = firstValueFrom(
            composition.submitPasswordRecovery.submit({
                email: 'person@example.com',
            })
        );
        http.expectOne(forgotPasswordUrl).flush({
            error: false,
            message: 'OK',
            data: { message: 'Accepted.' },
        });
        await expect(submitted).resolves.toEqual({ message: 'Accepted.' });
        await settle();

        const refresh = http.expectOne(siteGroupsUrl);
        expect(refresh.request.context.get(BYPASS_CACHE)).toBe(true);
        http.expectNone((candidate) => candidate.url.startsWith(reportBaseUrl));
        flushSiteGroups(refresh);
        await settle();
        expect(composition.loadSiteGroups.state()).toBe('success');
    });

    it('n’invalide aucune query quand la commande distante échoue', async () => {
        const { composition, http } = configureRuntime();

        composition.loadSiteGroups.load();
        await settle();
        flushSiteGroups(http.expectOne(siteGroupsUrl));
        await settle();

        const submitted = firstValueFrom(
            composition.submitPasswordRecovery.submit({
                email: 'person@example.com',
            })
        );
        http.expectOne(forgotPasswordUrl).flush(
            { message: 'Unavailable.' },
            { status: 503, statusText: 'Unavailable' }
        );
        await expect(submitted).rejects.toBeInstanceOf(ServerResponseError);
        await settle();

        http.expectNone((candidate) => candidate.method === 'GET');
        expect(composition.loadSiteGroups.state()).toBe('success');
    });

    it('refuse le double submit sans second POST ni invalidation anticipée', async () => {
        const { composition, http } = configureRuntime();
        const first = firstValueFrom(
            composition.submitPasswordRecovery.submit({
                email: 'first@example.com',
            })
        );
        const request = http.expectOne(forgotPasswordUrl);

        await expect(
            firstValueFrom(
                composition.submitPasswordRecovery.submit({
                    email: 'second@example.com',
                })
            )
        ).rejects.toMatchObject({ code: 'ACTION_REQUEST_PENDING' });
        expect(composition.submitPasswordRecovery.state()).toBe('submitting');
        http.expectNone(
            (candidate) => candidate.body?.email === 'second@example.com'
        );
        http.expectNone((candidate) => candidate.method === 'GET');

        request.flush({
            error: false,
            message: 'OK',
            data: { message: 'Accepted.' },
        });
        await expect(first).resolves.toEqual({ message: 'Accepted.' });
        expect(composition.submitPasswordRecovery.state()).toBe('success');
        http.expectNone((candidate) => candidate.method === 'GET');
    });
});
