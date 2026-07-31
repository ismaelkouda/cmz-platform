export const REPORT_STATES_DETAILS_TABS = [
    { id: 'information', label: 'REQUESTS.DETAILS.TABS.INFORMATION' },
    { id: 'photos', label: 'REQUESTS.DETAILS.TABS.PHOTOS' },
    { id: 'location', label: 'REQUESTS.DETAILS.TABS.LOCATION' },
] as const;

export type ReportStatesDetailsTabId =
    (typeof REPORT_STATES_DETAILS_TABS)[number]['id'];
