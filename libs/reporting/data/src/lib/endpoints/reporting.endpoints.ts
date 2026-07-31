/**
 * Les 4 clés d'endpoints du module `reporting` (`REPORT`, `REQUESTS`,
 * `REPORT_BY_CHANNEL`, `REPORT_BY_OPERATOR`) Réduit à la seule clé réelle. ciblent toutes la ressource
 * de configuration `/variables` backend, partagée par plusieurs modules.
 */
export const REPORTING_ENDPOINTS = {
    VARIABLES: 'variables',
} as const;
