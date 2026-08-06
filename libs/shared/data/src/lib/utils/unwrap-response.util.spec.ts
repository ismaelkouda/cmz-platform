import { describe, expect, it } from 'vitest';
import { ServerResponseError, UnknownError } from '@cmz/shared-domain';
import { assertResponseOk, unwrapResponse } from './unwrap-response.util';

/**
 * Chantier L (onzième passe, 2026-08-04) — `unwrapResponse`/`assertResponseOk`
 * n'avaient jamais eu de test dédié malgré leur position centrale : c'est le
 * point d'entrée unique pour dé-emballer l'enveloppe `{error, message, data}`
 * de **toute** réponse HTTP réussie (statut 200) de l'application — les 4
 * mappers de base (`PaginatedMapper`, `SimpleResponseMapper`,
 * `MessageResponseMapper`, `ArrayResponseMapper`) s'appuient tous dessus.
 * Complète, côté enveloppe HTTP-200, la couverture apportée à
 * `errorInterceptor` (côté transport, statuts non-200) le 2026-08-03 (I-8/P-9).
 */
describe('unwrapResponse', () => {
    it('retourne data quand error est false et data est présente', () => {
        const dto = { error: false, message: '', data: { id: 1 } };
        expect(unwrapResponse(dto)).toEqual({ id: 1 });
    });

    it('retourne une donnée falsy valide (0, "", false, []) sans la confondre avec une absence', () => {
        expect(unwrapResponse({ error: false, message: '', data: 0 })).toBe(0);
        expect(unwrapResponse({ error: false, message: '', data: '' })).toBe(
            ''
        );
        expect(unwrapResponse({ error: false, message: '', data: false })).toBe(
            false
        );
        expect(unwrapResponse({ error: false, message: '', data: [] })).toEqual(
            []
        );
    });

    it('lève ServerResponseError avec le message serveur quand error est true — même si data est présente', () => {
        const dto = {
            error: true,
            message: 'Ressource introuvable.',
            data: { id: 1 },
        };
        expect(() => unwrapResponse(dto)).toThrow(ServerResponseError);
        try {
            unwrapResponse(dto);
            expect.unreachable('devait lever');
        } catch (e) {
            expect((e as ServerResponseError).messageKey).toBe(
                'Ressource introuvable.'
            );
        }
    });

    it('lève UnknownError quand data est undefined malgré error:false — intégrité du contrat, pas une erreur métier', () => {
        const dto = { error: false, message: '', data: undefined };
        expect(() => unwrapResponse(dto)).toThrow(UnknownError);
    });

    it('lève UnknownError quand data est null malgré error:false', () => {
        const dto = { error: false, message: '', data: null };
        expect(() => unwrapResponse(dto)).toThrow(UnknownError);
    });

    it("priorise error:true sur l'absence de data — un vrai message serveur ne doit jamais être masqué par UnknownError", () => {
        const dto = { error: true, message: 'Accès refusé.', data: null };
        expect(() => unwrapResponse(dto)).toThrow(ServerResponseError);
    });
});

describe('assertResponseOk', () => {
    it('ne lève rien quand error est false', () => {
        expect(() =>
            assertResponseOk({ error: false, message: '' })
        ).not.toThrow();
    });

    it('lève ServerResponseError avec le message serveur quand error est true', () => {
        try {
            assertResponseOk({ error: true, message: 'Suppression refusée.' });
            expect.unreachable('devait lever');
        } catch (e) {
            expect(e).toBeInstanceOf(ServerResponseError);
            expect((e as ServerResponseError).messageKey).toBe(
                'Suppression refusée.'
            );
        }
    });
});
