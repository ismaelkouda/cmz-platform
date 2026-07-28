/**
 * Contrat d'endpoints canonique du module `report-states`.
 */
export const REPORT_STATES_ENDPOINTS = {
    APPROVE: 'requests/approved',
    EVALUATE: 'finalizations/evaluated',
    CLOSE: 'finalizations',
    REJECT: 'requests/rejected',
    DOWNLOAD: 'exports',
    DETAILS_REPORT_STATES: 'requests',
} as const;
