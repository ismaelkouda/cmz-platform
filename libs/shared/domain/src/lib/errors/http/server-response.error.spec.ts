import { describe, expect, it } from 'vitest';
import { ServerResponseError } from './server-response.error';

/**
 * T12-3 (P2, 2026-08-13) — jamais testé. Seul mapper d'erreur du dossier
 * `errors/http` avec un vrai branchement `||` (fallback sur clé i18n
 * générique si le serveur ne renvoie pas de message).
 */
describe('ServerResponseError', () => {
    it('utilise le message serveur tel quel comme messageKey s’il est fourni', () => {
        const error = new ServerResponseError('ERRORS.CUSTOM.QUOTA_EXCEEDED');
        expect(error.messageKey).toBe('ERRORS.CUSTOM.QUOTA_EXCEEDED');
        expect(error.message).toBe('ERRORS.CUSTOM.QUOTA_EXCEEDED');
    });

    it('retombe sur la clé i18n générique si le message serveur est une chaîne vide', () => {
        const error = new ServerResponseError('');
        expect(error.messageKey).toBe('ERRORS.HTTP.SERVER_ERROR');
        expect(error.message).toBe('ERRORS.HTTP.SERVER_ERROR');
    });

    it('expose code et statusCode fixes (422, SERVER_RESPONSE_ERROR)', () => {
        const error = new ServerResponseError('x');
        expect(error.code).toBe('SERVER_RESPONSE_ERROR');
        expect(error.statusCode).toBe(422);
    });

    it('est une instance de DomainError et Error (chaîne de prototype préservée)', () => {
        const error = new ServerResponseError('x');
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ServerResponseError');
    });
});
