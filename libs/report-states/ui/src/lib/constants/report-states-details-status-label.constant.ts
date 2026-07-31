import { ReportStatesDetailsStatus } from '@cmz/report-states-domain';

export const REPORT_STATES_DETAILS_STATUS_LABEL: Record<
    ReportStatesDetailsStatus,
    string
> = {
    [ReportStatesDetailsStatus.PENDING]: 'REQUESTS.DETAILS.STATUS.PENDING',
    [ReportStatesDetailsStatus.APPROVED]: 'REQUESTS.ALL.FILTER.STATUS_APPROVED',
    [ReportStatesDetailsStatus.REJECTED]: 'REQUESTS.ALL.FILTER.STATUS_REJECTED',
    [ReportStatesDetailsStatus.ABANDONED]:
        'REQUESTS.ALL.FILTER.STATUS_ABANDONED',
    [ReportStatesDetailsStatus.IN_PROGRESS]:
        'REQUESTS.ALL.FILTER.STATUS_IN_PROGRESS',
    [ReportStatesDetailsStatus.TERMINATED]:
        'REQUESTS.ALL.FILTER.STATUS_TERMINATED',
    [ReportStatesDetailsStatus.CONFIRMED]:
        'REQUESTS.ALL.FILTER.STATUS_CONFIRMED',
};
