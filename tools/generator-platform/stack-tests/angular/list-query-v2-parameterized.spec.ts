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
    REPORT_API_URL,
    SKIP_AUTH,
    cacheInterceptor,
} from '@cmz/core';
import { ErrorHandlerRegistry, SessionService } from '@cmz/shared-application';
import { errorInterceptor } from '@cmz/shared-data';
import { InvalidPayloadError } from '@cmz/shared-domain';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from '../../../../apps/backoffice-angular/src/app/interceptors/auth.interceptor';
import { ListReportActionTypesFacade } from '../../.stack-test-runtime/angular/list-query-v2-tasks-actions-processing-type/src/list-report-action-types.facade';
import { ListReportActionTypesSource } from '../../.stack-test-runtime/angular/list-query-v2-tasks-actions-processing-type/src/list-report-action-types.source';

const baseUrl = 'https://report.example.test/';

interface Runtime {
    readonly errorHandler: { readonly handle: ReturnType<typeof vi.fn> };
    readonly facade: ListReportActionTypesFacade;
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
            { provide: REPORT_API_URL, useValue: baseUrl },
            { provide: ErrorHandlerRegistry, useValue: errorHandler },
            HttpCacheStore,
            ListReportActionTypesSource,
            ListReportActionTypesFacade,
        ],
    });
    return {
        errorHandler,
        facade: TestBed.inject(ListReportActionTypesFacade),
        http: TestBed.inject(HttpTestingController),
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

describe('list-query v2 Angular — path et tableau imbriqué réels', () => {
    it('encode le report id comme un seul segment et mappe les opérateurs autorisés', async () => {
        const { facade, http } = configureRuntime();

        facade.load({ reportUniqId: 'report/équipe A' });
        await settle();

        const request = http.expectOne(
            `${baseUrl}processing-actions/report%2F%C3%A9quipe%20A/report-types`
        );
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
                    code: 'contact-customer',
                    name: 'Contacter le client',
                    operators: ['mtn', 'orange'],
                },
            ],
        });
        await settle();

        expect(facade.items()).toEqual([
            {
                value: 'contact-customer',
                label: 'Contacter le client',
                operators: ['mtn', 'orange'],
            },
        ]);
        expect(facade.state()).toBe('success');
    });

    it.each([
        { label: 'hors enum', operators: ['vodafone'] },
        { label: 'de type faux', operators: [42] },
    ])(
        'rejette un opérateur $label avant le read model',
        async ({ operators }) => {
            const { errorHandler, facade, http } = configureRuntime();
            facade.load({ reportUniqId: 'report-1' });
            await settle();

            http.expectOne(
                `${baseUrl}processing-actions/report-1/report-types`
            ).flush({
                error: false,
                message: 'OK',
                data: [
                    {
                        code: 'contact-customer',
                        name: 'Contacter le client',
                        operators,
                    },
                ],
            });
            await settle();

            expect(facade.state()).toBe('error');
            expect(facade.error()).toBeInstanceOf(InvalidPayloadError);
            expect(errorHandler.handle).toHaveBeenCalledWith(
                expect.any(InvalidPayloadError)
            );
        }
    );

    it('rejette un identifiant vide avant tout appel HTTP', async () => {
        const { errorHandler, facade, http } = configureRuntime();
        facade.load({ reportUniqId: '' });
        await settle();

        http.expectNone(() => true);
        expect(facade.state()).toBe('error');
        expect(facade.error()).toBeInstanceOf(InvalidPayloadError);
        expect(errorHandler.handle).toHaveBeenCalledWith(
            expect.any(InvalidPayloadError)
        );
    });

    it('réutilise le même input au reload et contourne le cache du host', async () => {
        const { facade, http } = configureRuntime();
        facade.load({ reportUniqId: 'report-1' });
        await settle();
        http.expectOne(
            `${baseUrl}processing-actions/report-1/report-types`
        ).flush({ error: false, message: 'OK', data: [] });
        await settle();

        facade.reload();
        await settle();
        const refresh = http.expectOne(
            `${baseUrl}processing-actions/report-1/report-types`
        );
        expect(refresh.request.context.get(BYPASS_CACHE)).toBe(true);
        refresh.flush({ error: false, message: 'OK', data: [] });
        await settle();

        expect(facade.state()).toBe('empty');
    });

    it('annule le report précédent quand un nouvel input le supplante', async () => {
        const { facade, http } = configureRuntime();
        facade.load({ reportUniqId: 'report-1' });
        await settle();
        const first = http.expectOne(
            `${baseUrl}processing-actions/report-1/report-types`
        );

        facade.load({ reportUniqId: 'report-2' });
        await settle();

        expect(first.cancelled).toBe(true);
        const latest = http.expectOne(
            `${baseUrl}processing-actions/report-2/report-types`
        );
        latest.flush({ error: false, message: 'OK', data: [] });
        await settle();
        expect(facade.state()).toBe('empty');
    });
});
