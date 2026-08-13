import { MediaStatus } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { MediaStatusDto } from '../dtos/media-status.dto';
import { MediaStatusMapper } from './media-status.mapper';

/**
 * T12-3 (P2, 2026-08-13) — seul mapper `shared/data` dont le wire est un
 * booléen (`true`/`false`), pas une chaîne — pattern ternaire distinct de
 * tous les autres mappers `is*`-based du lot. Aucun cas d'erreur possible
 * (le type `boolean` ne laisse pas de 3e valeur), donc pas de branche
 * `throw` à tester ici, contrairement au reste du lot.
 */
describe('MediaStatusMapper', () => {
    const mapper = new MediaStatusMapper();

    it('mapFromDto() traduit true (wire) en MediaStatus.ACTIVE', () => {
        expect(mapper.mapFromDto(MediaStatusDto.ACTIVE)).toBe(
            MediaStatus.ACTIVE
        );
    });

    it('mapFromDto() traduit false (wire) en MediaStatus.INACTIVE', () => {
        expect(mapper.mapFromDto(MediaStatusDto.INACTIVE)).toBe(
            MediaStatus.INACTIVE
        );
    });

    it('mapToDto() est l’inverse exact de mapFromDto() pour les 2 valeurs', () => {
        expect(mapper.mapToDto(mapper.mapFromDto(true))).toBe(true);
        expect(mapper.mapToDto(mapper.mapFromDto(false))).toBe(false);
    });
});
