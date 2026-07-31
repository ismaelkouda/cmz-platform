/**
 * Contrat d'endpoints canonique du module `report-states`.
 */
export const REPORT_STATES_ENDPOINTS = {
    APPROVE: 'requests/approved',
    EVALUATE: 'finalizations/evaluated',
    CLOSE: 'finalizations',
    REJECT: 'requests/rejected',
    DOWNLOAD: 'exports',
    APPROVE_EXPORT: 'requests/approved/export',
    EVALUATE_EXPORT: 'finalizations/evaluated/export',
    CLOSE_EXPORT: 'finalizations/export',
    REJECT_EXPORT: 'requests/rejected/export',
    DETAILS_REPORT_STATES: 'requests',
} as const;
