import { describe, expect, it } from 'vitest';
import { ReportMediaMapper } from './report-media.mapper';

/**
 * T12-3 (P2, 2026-08-13) — null-safe dans les deux sens, avec en plus deux
 * champs internes nullable (`placePhoto`/`accessPlacePhoto`) indépendants
 * de la nullabilité du DTO lui-même — deux niveaux de `null` distincts à
 * ne pas confondre.
 */
describe('ReportMediaMapper', () => {
    const mapper = new ReportMediaMapper();

    it('mapToEntity() mappe place_photo/access_place_photo en camelCase', () => {
        const entity = mapper.mapToEntity({
            place_photo: 'https://cdn.example/photo.jpg',
            access_place_photo: 'https://cdn.example/photo-thumb.jpg',
        });
        expect(entity).toEqual({
            placePhoto: 'https://cdn.example/photo.jpg',
            accessPlacePhoto: 'https://cdn.example/photo-thumb.jpg',
        });
    });

    it('mapToEntity() retourne null si le DTO lui-même est null (média absent)', () => {
        expect(mapper.mapToEntity(null)).toBeNull();
    });

    it('mapToEntity() préserve des champs internes null même si le DTO est présent (pas de photo prise)', () => {
        const entity = mapper.mapToEntity({
            place_photo: null,
            access_place_photo: null,
        });
        expect(entity).toEqual({ placePhoto: null, accessPlacePhoto: null });
    });

    it('mapToDto() est l’inverse exact de mapToEntity()', () => {
        const dtoIn = {
            place_photo: 'p.jpg',
            access_place_photo: null,
        };
        expect(mapper.mapToDto(mapper.mapToEntity(dtoIn))).toEqual(dtoIn);
    });

    it('mapToDto() retourne null si l’entité est null', () => {
        expect(mapper.mapToDto(null)).toBeNull();
    });
});
