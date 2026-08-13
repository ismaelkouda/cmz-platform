import { describe, expect, it } from 'vitest';
import { ActorMapper } from './actor.mapper';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, ~4 appelants. Null-safe dans les
 * deux sens (`mapToEntity`/`mapToDto`) : verrouille explicitement le cas
 * `null` (acteur non assigné — initiateur/traiteur optionnel selon le
 * workflow), pas seulement le mapping champ à champ.
 */
describe('ActorMapper', () => {
    const mapper = new ActorMapper();

    it('mapToEntity() mappe tous les champs wire (snake_case) vers l’entité (camelCase)', () => {
        const entity = mapper.mapToEntity({
            id: 'actor-1',
            first_name: 'Jean',
            last_name: 'Dupont',
            phone: '690000000',
            email: 'jean.dupont@example.com',
        });

        expect(entity).toEqual({
            id: 'actor-1',
            firstName: 'Jean',
            lastName: 'Dupont',
            phone: '690000000',
            email: 'jean.dupont@example.com',
        });
    });

    it('mapToEntity() retourne null si le DTO est null (acteur non assigné)', () => {
        expect(mapper.mapToEntity(null)).toBeNull();
    });

    it('mapToDto() mappe l’entité vers le DTO wire', () => {
        const dto = mapper.mapToDto({
            id: 'actor-1',
            firstName: 'Jean',
            lastName: 'Dupont',
            phone: '690000000',
            email: 'jean.dupont@example.com',
        });

        expect(dto).toEqual({
            id: 'actor-1',
            first_name: 'Jean',
            last_name: 'Dupont',
            phone: '690000000',
            email: 'jean.dupont@example.com',
        });
    });

    it('mapToDto() retourne null si l’entité est null', () => {
        expect(mapper.mapToDto(null)).toBeNull();
    });
});
