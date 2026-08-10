export const REPORT_STATES_DETAILS_TABS = [
    { id: 'information', label: 'REPORT_STATES.DETAILS.TABS.INFORMATION' },
    { id: 'photos', label: 'REPORT_STATES.DETAILS.TABS.PHOTOS' },
    { id: 'location', label: 'REPORT_STATES.DETAILS.TABS.LOCATION' },
] as const;

export type ReportStatesDetailsTabId =
    (typeof REPORT_STATES_DETAILS_TABS)[number]['id'];
