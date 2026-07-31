/**
 * Contrat d'endpoints du module `requests`.
 * Un seul point de vérité — aligné source legacy `requests.endpoints.ts`.
 */
export const REQUESTS_ENDPOINTS = {
    QUEUES: 'requests/queues',
    TASKS: 'requests/task-baskets',
    ALL: 'requests/qualified',
    QUEUES_EXPORT: 'requests/queues/export',
    TASKS_EXPORT: 'requests/task-baskets/export',
    ALL_EXPORT: 'requests/qualified/export',
    /** Fiche demande — tranche B : GET/POST `requests/{uniq_id}`. */
    DETAILS_REQUESTS: 'requests',
} as const;
