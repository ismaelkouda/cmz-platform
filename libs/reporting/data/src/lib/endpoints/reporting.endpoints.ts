/**
 * Les 4 clés d'endpoints du module `reporting` (`REPORT`, `REQUESTS`,
 * `REPORT_BY_CHANNEL`, `REPORT_BY_OPERATOR`) ciblent toutes la ressource
 * de configuration `/variables` backend, partagée par plusieurs modules.
 */
export const REPORTING_ENDPOINTS = {
    VARIABLES: 'variables',
    REPORT: 'variables',
    REQUESTS: 'variables',
    REPORT_BY_CHANNEL: 'variables',
    REPORT_BY_OPERATOR: 'variables',
} as const;
