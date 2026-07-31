export const REQUESTS_DETAILS_TABS = [
    { id: 'information', label: 'REQUESTS.DETAILS.TABS.INFORMATION' },
    { id: 'photos', label: 'REQUESTS.DETAILS.TABS.PHOTOS' },
    { id: 'location', label: 'REQUESTS.DETAILS.TABS.LOCATION' },
] as const;

export type RequestsDetailsTabId = (typeof REQUESTS_DETAILS_TABS)[number]['id'];
