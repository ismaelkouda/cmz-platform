import { describe, expect, it } from 'vitest';
import { CoordinateMapper } from './coordinate.mapper';

/**
 * T12-3 (cartographie 2026-08-12) — jamais testé. Comportement non
 * documenté avant ce test, verrouillé explicitement : une latitude/
 * longitude hors bornes ou non parsable **n'est pas rejetée** — elle
 * devient silencieusement `0` (pas un `NaN`, pas une exception). Une
 * régression amont (ex. wire qui envoie une chaîne vide ou "N/A") produit
 * donc une coordonnée `(0, 0)` — Golfe de Guinée — sans aucune erreur
 * visible. Ce test ne juge pas ce choix, il le fige tel qu'implémenté.
 */
describe('CoordinateMapper', () => {
    const mapper = new CoordinateMapper();

    it('mapFromDto parse lat/long valides en nombres', () => {
        const result = mapper.mapFromDto({
            lat: '3.848',
            long: '11.502',
            what3words: 'table.chair.lamp',
        });
        expect(result.latitude).toBe(3.848);
        expect(result.longitude).toBe(11.502);
    });

    it('mapFromDto retombe sur 0 si la latitude est hors bornes [-90, 90]', () => {
        expect(
            mapper.mapFromDto({ lat: '91', long: '0', what3words: '' }).latitude
        ).toBe(0);
        expect(
            mapper.mapFromDto({ lat: '-91', long: '0', what3words: '' })
                .latitude
        ).toBe(0);
    });

    it('mapFromDto retombe sur 0 si la longitude est hors bornes [-180, 180]', () => {
        expect(
            mapper.mapFromDto({ lat: '0', long: '181', what3words: '' })
                .longitude
        ).toBe(0);
        expect(
            mapper.mapFromDto({ lat: '0', long: '-181', what3words: '' })
                .longitude
        ).toBe(0);
    });

    it('mapFromDto accepte les bornes exactes (90/-90, 180/-180) sans retomber à 0', () => {
        expect(
            mapper.mapFromDto({ lat: '90', long: '180', what3words: '' })
                .latitude
        ).toBe(90);
        expect(
            mapper.mapFromDto({ lat: '90', long: '180', what3words: '' })
                .longitude
        ).toBe(180);
        expect(
            mapper.mapFromDto({ lat: '-90', long: '-180', what3words: '' })
                .latitude
        ).toBe(-90);
    });

    it('mapFromDto retombe sur 0 si lat/long ne sont pas des nombres parsables', () => {
        const result = mapper.mapFromDto({
            lat: 'not-a-number',
            long: 'N/A',
            what3words: '',
        });
        expect(result.latitude).toBe(0);
        expect(result.longitude).toBe(0);
    });

    it('mapFromDto normalise what3words en minuscules, retire tout sauf lettres/points', () => {
        const result = mapper.mapFromDto({
            lat: '0',
            long: '0',
            what3words: 'Table.Chair.LAMP!',
        });
        expect(result.what3words).toBe('table.chair.lamp');
    });

    it('mapFromDto retourne une chaîne vide si what3words est vide', () => {
        expect(
            mapper.mapFromDto({ lat: '0', long: '0', what3words: '' })
                .what3words
        ).toBe('');
    });
});
