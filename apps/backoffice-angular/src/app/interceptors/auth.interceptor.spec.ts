import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
    HttpContext,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { SKIP_AUTH } from '@cmz/core';
import { SessionService } from '@cmz/shared-application';
import { authInterceptor } from './auth.interceptor';

/** Double de test pour `next` — ne fait jamais d'appel réseau réel. */
function next(response$: Observable<HttpEvent<unknown>>): HttpHandlerFn {
    return () => response$;
}

/**
 * `SessionService` réel injecte `StoragePort`/`NavigationPort` (Web Crypto
 * asynchrone) dans son constructeur — hors périmètre de ce test, qui porte
 * uniquement sur la décision de `authInterceptor` en fonction de
 * `session.token()`. On fournit donc un double minimal exposant la même
 * surface consommée (`token()` en lecture), comme le fait
 * `safe-url.pipe.spec.ts` pour ses propres dépendances.
 */
function configureWithToken(token: { value: string } | null): void {
    TestBed.configureTestingModule({
        providers: [
            {
                provide: SessionService,
                useValue: { token: () => token },
            },
        ],
    });
}

const req = new HttpRequest('GET', '/api/regions');

describe('authInterceptor', () => {
    it("ajoute l'en-tête Authorization quand un jeton est présent", async () => {
        configureWithToken({ value: 'abc123' });
        const handler = vi.fn(
            next(of({ type: 4 } as unknown as HttpEvent<unknown>))
        );

        await TestBed.runInInjectionContext(() =>
            firstValueFrom(authInterceptor(req, handler))
        );

        const forwarded = handler.mock.calls[0][0] as HttpRequest<unknown>;
        expect(forwarded.headers.get('Authorization')).toBe('Bearer abc123');
    });

    it("ne pose aucun en-tête Authorization quand il n'y a pas de jeton (session absente ou pas encore déchiffrée)", async () => {
        configureWithToken(null);
        const handler = vi.fn(
            next(of({ type: 4 } as unknown as HttpEvent<unknown>))
        );

        await TestBed.runInInjectionContext(() =>
            firstValueFrom(authInterceptor(req, handler))
        );

        const forwarded = handler.mock.calls[0][0] as HttpRequest<unknown>;
        expect(forwarded.headers.has('Authorization')).toBe(false);
    });

    it('laisse passer une requête marquée SKIP_AUTH sans jamais lire le jeton, même si un jeton est présent', async () => {
        configureWithToken({ value: 'abc123' });
        const skipReq = new HttpRequest('POST', '/api/auth/login', null, {
            context: new HttpContext().set(SKIP_AUTH, true),
        });
        const handler = vi.fn(
            next(of({ type: 4 } as unknown as HttpEvent<unknown>))
        );

        await TestBed.runInInjectionContext(() =>
            firstValueFrom(authInterceptor(skipReq, handler))
        );

        expect(handler).toHaveBeenCalledWith(skipReq);
    });
});
