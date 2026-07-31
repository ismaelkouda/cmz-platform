/** Étapes workflow requests — sans finalisation / clôture (legacy filtre `acknowledgedAt`, `finalizedAt`). */
export const REQUESTS_DETAILS_WORKFLOW_STEPS = [
    {
        key: 'reportedAt' as const,
        labelKey: 'MANAGEMENT.STATUS.SUBMISSION',
    },
    {
        key: 'approvedAt' as const,
        keyAlt: 'rejectedAt' as const,
        labelKey: 'MANAGEMENT.STATUS.QUALIFICATION',
    },
] as const;

export type RequestsDetailsWorkflowStepKey =
    (typeof REQUESTS_DETAILS_WORKFLOW_STEPS)[number]['key'];

export type RequestsDetailsWorkflowStepKeyAlt = 'rejectedAt';
