/**
 * Contrat d'endpoints du module `finalization`.
 * Aligné source legacy `finalization.endpoints.ts`.
 */
export const FINALIZATION_ENDPOINTS = {
    QUEUES: 'finalizations/queues',
    TASKS: 'finalizations/task-baskets',
    ALL: 'finalizations',
    QUEUES_EXPORT: 'finalizations/queues/export',
    TASKS_EXPORT: 'finalizations/task-baskets/export',
    ALL_EXPORT: 'finalizations/export',
    /** Préfixe take — GET fiche sur `{reportUrl}{uniq_id}`. */
    DETAILS_REPORTS: 'finalizations',
} as const;
