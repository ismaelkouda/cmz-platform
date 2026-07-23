import { ServerResponseError, UnknownError } from '@cmz/shared-domain';

interface ResponseEnvelope<T> {
    error: boolean;
    message: string;
    data?: T | null;
}

/**
 * Dé-emballe l'enveloppe API `{error, message, data}` — **un seul endroit**
 * (remplace les `validateResponse` dupliqués des 4 bases de mappers).
 * - `error:true`  → `ServerResponseError` (message serveur, affichable) ;
 * - data absente  → `UnknownError` (intégrité) ;
 * - sinon         → `data`.
 */
export function unwrapResponse<T>(dto: ResponseEnvelope<T>): T {
    if (dto.error) {
        throw new ServerResponseError(dto.message);
    }
    if (dto.data === undefined || dto.data === null) {
        throw new UnknownError();
    }
    return dto.data;
}

/** Variante sans payload (réponse « message seul »). */
export function assertResponseOk(dto: {
    error: boolean;
    message: string;
}): void {
    if (dto.error) {
        throw new ServerResponseError(dto.message);
    }
}
