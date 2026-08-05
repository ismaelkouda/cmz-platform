import { describe, expect, it } from 'vitest';
import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import {
    ServerResponseError,
    UnauthorizedError,
    UnknownError,
} from '@cmz/shared-domain';
import { errorInterceptor } from './error.interceptor';

const req = new HttpRequest('GET', '/api/anything');

/** Double de test pour `next` — ne fait jamais d'appel réseau réel. */
function next(response$: Observable<HttpEvent<unknown>>): HttpHandlerFn {
    return () => response$;
}

describe('errorInterceptor', () => {
    it('laisse passer une réponse réussie sans y toucher', async () => {
        const ok = { type: 4 } as unknown as HttpEvent<unknown>;
        const result = await firstValueFrom(
            errorInterceptor(req, next(of(ok)))
        );
        expect(result).toBe(ok);
    });

    it('convertit un 401 en UnauthorizedError — réutilise le handler existant de UiFeedbackService plutôt que d’en créer un nouveau', async () => {
        const httpError = new HttpErrorResponse({ status: 401 });
        await expect(
            firstValueFrom(
                errorInterceptor(req, next(throwError(() => httpError)))
            )
        ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it('convertit un statut 0 (réseau inatteignable/CORS) en UnknownError', async () => {
        const httpError = new HttpErrorResponse({ status: 0 });
        await expect(
            firstValueFrom(
                errorInterceptor(req, next(throwError(() => httpError)))
            )
        ).rejects.toBeInstanceOf(UnknownError);
    });

    it(
        'convertit tout autre statut HTTP en ServerResponseError, en ' +
            'préservant le message serveur — forme réelle : corps JSON ' +
            'objet ({ message }), pas une chaîne brute. Régression ' +
            'verrouillée le 2026-08-03 (I-8/P-8/P-9) : comparé au vrai ' +
            'mapper legacy (`error.error.message`), confirmé que la forme ' +
            "réelle d'un corps d'erreur JSON auto-parsé par HttpClient est " +
            "toujours un objet, jamais une chaîne — l'ancienne version de " +
            'ce test (`error: "..."`, une chaîne) ne pouvait pas détecter ' +
            'que `serverMessage` retombait sur le résumé technique ' +
            "générique d'Angular au lieu du message métier.",
        async () => {
            const httpError = new HttpErrorResponse({
                status: 500,
                error: { message: 'Erreur interne côté serveur' },
            });
            const error: ServerResponseError = await firstValueFrom(
                errorInterceptor(req, next(throwError(() => httpError)))
            ).catch((e) => e);
            expect(error).toBeInstanceOf(ServerResponseError);
            expect(error.messageKey).toBe('Erreur interne côté serveur');
        }
    );

    it('accepte aussi un corps brut en chaîne (Content-Type non-JSON) — repli, pas le cas nominal', async () => {
        const httpError = new HttpErrorResponse({
            status: 500,
            error: 'Erreur interne côté serveur (texte brut)',
        });
        const error: ServerResponseError = await firstValueFrom(
            errorInterceptor(req, next(throwError(() => httpError)))
        ).catch((e) => e);
        expect(error).toBeInstanceOf(ServerResponseError);
        expect(error.messageKey).toBe(
            'Erreur interne côté serveur (texte brut)'
        );
    });

    it(
        "retombe sur le résumé générique d'Angular seulement si le corps " +
            "n'a ni chaîne ni champ .message exploitable (dernier recours, " +
            'jamais le cas attendu contre le vrai backend)',
        async () => {
            const httpError = new HttpErrorResponse({
                status: 500,
                error: { code: 'SOME_CODE' }, // pas de champ `message`
                statusText: 'Internal Server Error',
            });
            const error: ServerResponseError = await firstValueFrom(
                errorInterceptor(req, next(throwError(() => httpError)))
            ).catch((e) => e);
            expect(error).toBeInstanceOf(ServerResponseError);
            expect(error.messageKey).toContain('500');
        }
    );

    it("ne convertit pas une erreur qui n'est pas une HttpErrorResponse — hors périmètre", async () => {
        const clientError = new Error('erreur cliente avant envoi');
        await expect(
            firstValueFrom(
                errorInterceptor(req, next(throwError(() => clientError)))
            )
        ).rejects.toBe(clientError);
    });

    it(
        'régression P0-7/I-3 verrouillée : avant ce correctif, une ' +
            'HttpErrorResponse brute atteignait ErrorHandlerRegistry sans ' +
            'messageKey → toast vide. La conversion en DomainError typée est ' +
            'désormais garantie pour tout statut HTTP.',
        async () => {
            const httpError = new HttpErrorResponse({ status: 401 });
            const error = await firstValueFrom(
                errorInterceptor(req, next(throwError(() => httpError)))
            ).catch((e) => e);
            expect(error.messageKey).toBeDefined();
            expect(error.statusCode).toBeDefined();
        }
    );
});
