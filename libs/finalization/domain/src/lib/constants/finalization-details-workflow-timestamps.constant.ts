/** Étapes workflow finalization details — soumission + qualification (legacy). */
export const FINALIZATION_DETAILS_WORKFLOW_STEPS = [
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

export type FinalizationDetailsWorkflowStepKey =
    (typeof FINALIZATION_DETAILS_WORKFLOW_STEPS)[number]['key'];

export type FinalizationDetailsWorkflowStepKeyAlt = 'rejectedAt';
