/**
 * Les 4 sous-pages `monitoring` sont des embeds Grafana en lecture seule.
 * Le source (`GET {SETTINGS_API_URL}variables`) confirme qu'il s'agit d'un
 * **même** endpoint de configuration système partagé par plusieurs modules
 * (le source y fait aussi référence depuis `reporting` et `interactive-
 * map`, non encore reconstruits) : chaque section ne fait que lire un champ
 * différent de la même réponse. `MonitoringSection` sélectionne ce champ —
 * cf. `MONITORING_SECTION_FIELD` (data) et `GrafanaDashboardMapper`.
 */
export const MonitoringSection = {
    NODE: 'node',
    SERVICES: 'services',
    RESOURCES: 'resources',
    JOBS: 'jobs',
} as const;

export type MonitoringSection =
    (typeof MonitoringSection)[keyof typeof MonitoringSection];
