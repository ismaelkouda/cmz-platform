import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_API_URL, SKIP_AUTH } from '@cmz/core';
import { SessionService } from '@cmz/shared-application';
import { errorInterceptor } from '@cmz/shared-data';
import { InvalidPayloadError, ServerResponseError } from '@cmz/shared-domain';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authInterceptor } from '../../../../apps/backoffice-angular/src/app/interceptors/auth.interceptor';
import {
    ActionRequestPendingError,
    ForgotPasswordFacade,
} from '../../.stack-test-runtime/angular/action-request-v2/src/forgot-password.facade';
import { ForgotPasswordSource } from '../../.stack-test-runtime/angular/action-request-v2/src/forgot-password.source';

const baseUrl = 'https://auth.example.test/';
const forgotPasswordUrl = `${baseUrl}forgot-password`;

interface Runtime {
    readonly facade: ForgotPasswordFacade;
    readonly http: HttpTestingController;
}

function configureRuntime(): Runtime {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(
                withInterceptors([authInterceptor, errorInterceptor])
            ),
            provideHttpClientTesting(),
            {
                provide: SessionService,
                useValue: { token: signal({ value: 'must-not-leak' }) },
            },
            { provide: AUTH_API_URL, useValue: baseUrl },
            ForgotPasswordSource,
            ForgotPasswordFacade,
        ],
    });
    return {
        facade: TestBed.inject(ForgotPasswordFacade),
        http: TestBed.inject(HttpTestingController),
    };
}

afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
});

describe('action-request v2 Angular — oracle host réel', () => {
    it('valide, envoie le payload exact sans Bearer et décode le résultat', async () => {
        const { facade, http } = configureRuntime();
        expect(facade.state()).toBe('idle');

        const resultPromise = firstValueFrom(
            facade.submit({ email: 'person@example.com' })
        );
        expect(facade.state()).toBe('submitting');

        const request = http.expectOne(forgotPasswordUrl);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({
            email: 'person@example.com',
        });
        expect(request.request.headers.get('Accept')).toBe('application/json');
        expect(request.request.headers.get('Content-Type')).toBe(
            'application/json'
        );
        expect(request.request.context.get(SKIP_AUTH)).toBe(true);
        expect(request.request.headers.has('Authorization')).toBe(false);
        request.flush({
            error: false,
            message: 'OK',
            data: { message: 'Reset instructions sent.' },
        });

        await expect(resultPromise).resolves.toEqual({
            message: 'Reset instructions sent.',
        });
        expect(facade.result()).toEqual({
            message: 'Reset instructions sent.',
        });
        expect(facade.error()).toBeUndefined();
        expect(facade.state()).toBe('success');
    });

    it('rejette une entrée invalide avant tout appel HTTP', async () => {
        const { facade, http } = configureRuntime();

        await expect(
            firstValueFrom(facade.submit({ email: 'not-an-email' }))
        ).rejects.toBeInstanceOf(InvalidPayloadError);
        http.expectNone(forgotPasswordUrl);
        expect(facade.error()).toBeInstanceOf(InvalidPayloadError);
        expect(facade.state()).toBe('error');

        await expect(
            firstValueFrom(facade.submit({ email: ' person@example.com ' }))
        ).rejects.toBeInstanceOf(InvalidPayloadError);
        http.expectNone(forgotPasswordUrl);
    });

    it('efface le résultat précédent au début d’une nouvelle tentative', async () => {
        const { facade, http } = configureRuntime();
        const first = firstValueFrom(
            facade.submit({ email: 'person@example.com' })
        );
        http.expectOne(forgotPasswordUrl).flush({
            error: false,
            message: 'OK',
            data: { message: 'Accepted.' },
        });
        await first;
        expect(facade.result()).toEqual({ message: 'Accepted.' });

        await expect(
            firstValueFrom(facade.submit({ email: 'invalid' }))
        ).rejects.toBeInstanceOf(InvalidPayloadError);
        http.expectNone(forgotPasswordUrl);
        expect(facade.result()).toBeUndefined();
        expect(facade.state()).toBe('error');
    });

    it('rejette les champs d’entrée et de réponse non déclarés', async () => {
        const { facade, http } = configureRuntime();

        await expect(
            firstValueFrom(
                facade.submit({
                    email: 'person@example.com',
                    extra: 'invented',
                } as never)
            )
        ).rejects.toBeInstanceOf(InvalidPayloadError);
        http.expectNone(forgotPasswordUrl);

        const resultPromise = firstValueFrom(
            facade.submit({ email: 'person@example.com' })
        );
        http.expectOne(forgotPasswordUrl).flush({
            error: false,
            message: 'OK',
            data: {
                message: 'Reset instructions sent.',
                extra: 'invented',
            },
        });
        await expect(resultPromise).rejects.toBeInstanceOf(InvalidPayloadError);
        expect(facade.state()).toBe('error');

        const envelopePromise = firstValueFrom(
            facade.submit({ email: 'person@example.com' })
        );
        http.expectOne(forgotPasswordUrl).flush({
            error: false,
            message: 'OK',
            data: { message: 'Reset instructions sent.' },
            extra: 'invented',
        });
        await expect(envelopePromise).rejects.toBeInstanceOf(
            InvalidPayloadError
        );
    });

    it('refuse un statut 2xx différent du succès contractuel', async () => {
        const { facade, http } = configureRuntime();
        const resultPromise = firstValueFrom(
            facade.submit({ email: 'person@example.com' })
        );

        http.expectOne(forgotPasswordUrl).flush(
            {
                error: false,
                message: 'OK',
                data: { message: 'Reset instructions sent.' },
            },
            { status: 201, statusText: 'Created' }
        );

        await expect(resultPromise).rejects.toMatchObject({
            name: 'InvalidPayloadError',
            params: { path: '$.status', expected: 'HTTP 200' },
        });
        expect(facade.state()).toBe('error');
    });

    it('distingue une erreur métier d’enveloppe d’une réponse valide', async () => {
        const { facade, http } = configureRuntime();
        const resultPromise = firstValueFrom(
            facade.submit({ email: 'person@example.com' })
        );

        http.expectOne(forgotPasswordUrl).flush({
            error: true,
            message: 'Account is locked.',
            data: null,
        });

        await expect(resultPromise).rejects.toMatchObject({
            name: 'ServerResponseError',
            messageKey: 'Account is locked.',
        });
        expect(facade.error()).toBeInstanceOf(ServerResponseError);
        expect(facade.state()).toBe('error');
    });

    it('refuse un double submit sans perturber la commande déjà en vol', async () => {
        const { facade, http } = configureRuntime();
        const first = firstValueFrom(
            facade.submit({ email: 'first@example.com' })
        );
        const request = http.expectOne(forgotPasswordUrl);

        await expect(
            firstValueFrom(facade.submit({ email: 'second@example.com' }))
        ).rejects.toBeInstanceOf(ActionRequestPendingError);
        expect(facade.state()).toBe('submitting');
        http.expectNone(
            (candidate) => candidate.body?.email === 'second@example.com'
        );

        request.flush({
            error: false,
            message: 'OK',
            data: { message: 'Accepted.' },
        });
        await expect(first).resolves.toEqual({ message: 'Accepted.' });
        expect(facade.state()).toBe('success');
    });

    it('reçoit les erreurs HTTP déjà typées par l’intercepteur du host', async () => {
        const { facade, http } = configureRuntime();
        const resultPromise = firstValueFrom(
            facade.submit({ email: 'person@example.com' })
        );

        http.expectOne(forgotPasswordUrl).flush(
            { message: 'Service unavailable.' },
            { status: 503, statusText: 'Unavailable' }
        );

        await expect(resultPromise).rejects.toMatchObject({
            name: 'ServerResponseError',
            messageKey: 'Service unavailable.',
        });
        expect(facade.error()).toBeInstanceOf(ServerResponseError);
        expect(facade.state()).toBe('error');
    });
});
