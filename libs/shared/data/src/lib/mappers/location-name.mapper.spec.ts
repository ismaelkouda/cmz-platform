import { LocationName } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { LocationNameDto } from '../dtos/location-name.dto';
import { LocationNameMapper } from './location-name.mapper';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, 0 appelant direct trouvé mais
 * logique la plus riche du lot des mappers `location*` : double table
 * `FROM_WIRE`/`TO_WIRE` (pas de simple guard `is*`) + `parse()` tolérant
 * qui accepte à la fois le wire ET le code métier — les deux tables
 * doivent rester en bijection exacte, sinon un round-trip silencieusement
 * incohérent (ex. wire A → domaine B → wire C ≠ A).
 */
describe('LocationNameMapper', () => {
    const mapper = new LocationNameMapper();

    it('mapFromDto() traduit les 4 valeurs wire connues vers le domaine', () => {
        expect(mapper.mapFromDto(LocationNameDto.RESIDENCE_PLACE)).toBe(
            LocationName.RESIDENCE_PLACE
        );
        expect(mapper.mapFromDto(LocationNameDto.ACTIVITY_PLACE)).toBe(
            LocationName.ACTIVITY_PLACE
        );
        expect(mapper.mapFromDto(LocationNameDto.TRANSIT_PLACE)).toBe(
            LocationName.TRANSIT_PLACE
        );
        expect(mapper.mapFromDto(LocationNameDto.PLACE_NOT_PROVIDED)).toBe(
            LocationName.PLACE_NOT_PROVIDED
        );
    });

    it('mapFromDto() lève ApiError sur une valeur wire inconnue', () => {
        expect(() => mapper.mapFromDto('bogus' as LocationNameDto)).toThrow(
            /LocationName wire inconnue/
        );
    });

    it('mapToDto() est l’inverse exact de mapFromDto() pour les 4 valeurs (bijection FROM_WIRE/TO_WIRE)', () => {
        for (const dto of Object.values(LocationNameDto)) {
            const domain = mapper.mapFromDto(dto);
            expect(mapper.mapToDto(domain)).toBe(dto);
        }
    });

    it('parse() accepte une valeur wire brute', () => {
        expect(mapper.parse(LocationNameDto.TRANSIT_PLACE)).toBe(
            LocationName.TRANSIT_PLACE
        );
    });

    it('parse() accepte aussi directement un code métier domaine (tolérance forms/query params)', () => {
        expect(mapper.parse(LocationName.ACTIVITY_PLACE)).toBe(
            LocationName.ACTIVITY_PLACE
        );
    });

    it('parse() lève ApiError sur une chaîne qui n’est ni un wire ni un code métier valide', () => {
        expect(() => mapper.parse('not-a-location-name')).toThrow(
            /LocationName inconnue/
        );
    });
});
