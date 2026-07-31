import { RequestsDetailsStatus } from '@cmz/requests-domain';

export const REQUESTS_DETAILS_STATUS_LABEL: Record<
    RequestsDetailsStatus,
    string
> = {
    [RequestsDetailsStatus.PENDING]: 'REQUESTS.DETAILS.STATUS.PENDING',
    [RequestsDetailsStatus.APPROVED]: 'REQUESTS.ALL.FILTER.STATUS_APPROVED',
    [RequestsDetailsStatus.REJECTED]: 'REQUESTS.ALL.FILTER.STATUS_REJECTED',
    [RequestsDetailsStatus.ABANDONED]: 'REQUESTS.ALL.FILTER.STATUS_ABANDONED',
    [RequestsDetailsStatus.IN_PROGRESS]:
        'REQUESTS.ALL.FILTER.STATUS_IN_PROGRESS',
    [RequestsDetailsStatus.TERMINATED]: 'REQUESTS.ALL.FILTER.STATUS_TERMINATED',
    [RequestsDetailsStatus.CONFIRMED]: 'REQUESTS.ALL.FILTER.STATUS_CONFIRMED',
};
