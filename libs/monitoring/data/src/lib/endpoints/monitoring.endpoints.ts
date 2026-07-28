/**
 * Le source déclarait 4 clés (`NODE`/`SERVICES`/`VARIABLES`/`JOBS`) toutes
 * égales à la chaîne `'variables'` — une seule vraie ressource, présentée à
 * tort comme 4 endpoints distincts. Réduit à la seule clé réelle.
 */
export const MONITORING_ENDPOINTS = {
    VARIABLES: 'variables',
} as const;
