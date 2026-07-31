export const REPORT_STATES_DETAILS_APPROVAL_TYPES = [
    {
        value: 'view',
        label: 'MANAGEMENT.TREATMENT.CALLBACK_ACTION.OPTIONS.DETAILS.LABEL',
    },
    {
        value: 'edit',
        label: 'MANAGEMENT.TREATMENT.CALLBACK_ACTION.OPTIONS.EDIT.LABEL',
    },
    {
        value: 'callback',
        label: 'MANAGEMENT.TREATMENT.CALLBACK_ACTION.OPTIONS.CALLBACK.LABEL',
    },
] as const;

export type ReportStatesDetailsApprovalType =
    (typeof REPORT_STATES_DETAILS_APPROVAL_TYPES)[number]['value'];
