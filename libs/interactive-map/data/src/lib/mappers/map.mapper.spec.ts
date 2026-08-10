import { describe, expect, it } from 'vitest';
import { MapMapper } from './map.mapper';

function envelope(data: { mapLink?: string; map_link?: string }) {
    return { error: false, message: '', data };
}

describe('MapMapper', () => {
    it('préfère mapLink camelCase', () => {
        const entity = new MapMapper().mapFromDto(
            envelope({
                mapLink: 'https://grafana.example/map',
                map_link: 'https://ignored',
            })
        );
        expect(entity.grafanaLink).toBe('https://grafana.example/map');
    });

    it('fallback map_link snake_case si mapLink absent', () => {
        const entity = new MapMapper().mapFromDto(
            envelope({ map_link: 'https://grafana.example/map-snake' })
        );
        expect(entity.grafanaLink).toBe('https://grafana.example/map-snake');
    });

    it('retourne "" si aucun lien présent', () => {
        const entity = new MapMapper().mapFromDto(envelope({}));
        expect(entity.grafanaLink).toBe('');
    });
});
