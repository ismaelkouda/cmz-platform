import { describe, expect, it } from 'vitest';
import { ApiError } from './api.error';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, ~20 appelants (toutes les factories
 * confondues, à travers l'ensemble des mappers `shared/data`). Verrouille le
 * `code` distinctif de chaque factory (consommé par `ErrorHandlerRegistry`
 * pour le routage) et le message construit, pas seulement l'instanciation.
 */
describe('ApiError', () => {
    it('est une vraie instance Error avec name "ApiError" (compatible instanceof après transpilation)', () => {
        const error = ApiError.invalidResponse('boom');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ApiError);
        expect(error.name).toBe('ApiError');
    });

    it('fetchFailed() construit un message avec le nom d’entité et le code FETCH_FAILED', () => {
        const error = ApiError.fetchFailed('ReportStates');
        expect(error.message).toBe(
            'Impossible de récupérer les données de ReportStates'
        );
        expect(error.code).toBe('FETCH_FAILED');
        expect(error.originalError).toBeUndefined();
    });

    it('fetchFailed() transmet originalError tel quel (pas transformé)', () => {
        const cause = new Error('network down');
        const error = ApiError.fetchFailed('Requests', cause);
        expect(error.originalError).toBe(cause);
    });

    it('invalidResponse() utilise le message fourni tel quel et le code INVALID_RESPONSE', () => {
        const error = ApiError.invalidResponse('RoleDto inconnu: bogus');
        expect(error.message).toBe('RoleDto inconnu: bogus');
        expect(error.code).toBe('INVALID_RESPONSE');
    });

    it('mappingFailed() construit un message avec le nom d’entité et le code MAPPING_FAILED', () => {
        const error = ApiError.mappingFailed('TreaterInfo');
        expect(error.message).toBe(
            'Échec de la transformation des données pour TreaterInfo'
        );
        expect(error.code).toBe('MAPPING_FAILED');
    });

    it('les 3 factories produisent des codes distincts (routage ErrorHandlerRegistry par code)', () => {
        const codes = [
            ApiError.fetchFailed('X').code,
            ApiError.invalidResponse('X').code,
            ApiError.mappingFailed('X').code,
        ];
        expect(new Set(codes).size).toBe(3);
    });
});
