/**
 * Contrat d'endpoints du module `processing`.
 * Un seul point de vérité — aligné source legacy `processing.endpoints.ts`.
 */
export const PROCESSING_ENDPOINTS = {
    QUEUES: 'queues',
    TASKS: 'taken',
    ALL: 'processing',
    QUEUES_EXPORT: 'queues/export',
    TASKS_EXPORT: 'taken/export',
    ALL_EXPORT: 'processing/export',
    /** Actions CRUD sur une tâche — tranche workflow. */
    PROCESSING: 'processing-actions',
    /** Fiche signalement — tranche workflow. */
    DETAILS_REPORTS: '{id}',
} as const;
