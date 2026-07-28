/**
 * Contrat d'endpoints canonique du module `interactive-map`.
 * `MAP` pointe sur `/variables` (clé `mapLink`).
 */
export const INTERACTIVE_MAP_ENDPOINTS = {
    MAP: 'variables',
    REPORTS: 'all',
    MAP_CLUSTERS: 'map/clusters',
    COVERAGE_AREAS_GEOJSON: 'coverage-areas/geojson',
    COVERAGE_AREAS_TILES: 'coverage-areas/tiles/{z}/{x}/{y}',
} as const;
