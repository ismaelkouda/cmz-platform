import { Injector, runInInjectionContext } from '@angular/core';
import { LocationMethod, LocationType } from '@cmz/shared-domain';
import { describe, expect, it } from 'vitest';
import { LocationMapper } from './location.mapper';
import { LocationMethodMapper } from './location-method.mapper';
import { LocationTypeMapper } from './location-type.mapper';

/**
 * T12-3 (P1, 2026-08-13) — jamais testé, ~4 appelants. Compose deux vrais
 * mappers dépendants (`inject()` en field initializer, nécessite un
 * contexte d'injection actif — `Injector.create` + `runInInjectionContext`,
 * même technique que `safe-url.pipe.spec.ts`) plutôt que des doublures :
 * les deux sous-mappers sont de simples guards `is*`, aucune raison de les
 * mocker. Verrouille surtout le fallback à `0` sur coordonnées non
 * parsables — même comportement silencieux que `CoordinateMapper`, mais
 * cette fois sans borne [-90,90]/[-180,180] (`LocationMapper` ne valide que
 * `NaN`, pas les bornes géographiques).
 */
function createMapper(): LocationMapper {
    const injector = Injector.create({
        providers: [LocationMethodMapper, LocationTypeMapper, LocationMapper],
    });
    return runInInjectionContext(injector, () => injector.get(LocationMapper));
}

describe('LocationMapper', () => {
    it('mapToEntity() parse lat/long valides et délègue method/type aux sous-mappers', () => {
        const mapper = createMapper();

        const entity = mapper.mapToEntity({
            lat: '3.848',
            long: '11.502',
            what3words: 'table.chair.lamp',
            location_method: LocationMethod.AUTO,
            location_type: LocationType.GPS,
            location_name: 'Domicile',
            place_description: 'Près du marché',
        });

        expect(entity.coordinates).toEqual({
            latitude: 3.848,
            longitude: 11.502,
            what3words: 'table.chair.lamp',
        });
        expect(entity.method).toBe(LocationMethod.AUTO);
        expect(entity.type).toBe(LocationType.GPS);
        expect(entity.name).toBe('Domicile');
        expect(entity.description).toBe('Près du marché');
    });

    it('mapToEntity() retombe sur 0 si lat/long ne sont pas parsables (pas de borne géographique, contrairement à CoordinateMapper)', () => {
        const mapper = createMapper();

        const entity = mapper.mapToEntity({
            lat: 'N/A',
            long: 'not-a-number',
            what3words: '',
            location_method: LocationMethod.MANUAL,
            location_type: LocationType.MANUAL,
            location_name: '',
            place_description: '',
        });

        expect(entity.coordinates.latitude).toBe(0);
        expect(entity.coordinates.longitude).toBe(0);
    });

    it('mapToEntity() propage l’exception du sous-mapper si location_method est une valeur wire inconnue', () => {
        const mapper = createMapper();

        expect(() =>
            mapper.mapToEntity({
                lat: '0',
                long: '0',
                what3words: '',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                location_method: 'bogus' as any,
                location_type: LocationType.GPS,
                location_name: '',
                place_description: '',
            })
        ).toThrow(/LocationMethod wire inconnue/);
    });
});
