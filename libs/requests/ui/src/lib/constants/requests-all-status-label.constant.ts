import { RequestsAllStatus } from '@cmz/requests-domain';

export const REQUESTS_ALL_STATUS_LABEL: Record<RequestsAllStatus, string> = {
    [RequestsAllStatus.APPROVED]: 'REQUESTS.ALL.FILTER.STATUS_APPROVED',
    [RequestsAllStatus.REJECTED]: 'REQUESTS.ALL.FILTER.STATUS_REJECTED',
    [RequestsAllStatus.ABANDONED]: 'REQUESTS.ALL.FILTER.STATUS_ABANDONED',
    [RequestsAllStatus.IN_PROGRESS]: 'REQUESTS.ALL.FILTER.STATUS_IN_PROGRESS',
    [RequestsAllStatus.TERMINATED]: 'REQUESTS.ALL.FILTER.STATUS_TERMINATED',
    [RequestsAllStatus.CONFIRMED]: 'REQUESTS.ALL.FILTER.STATUS_CONFIRMED',
};

export const REQUESTS_ALL_STATUS_OPTIONS = (
    Object.values(RequestsAllStatus) as RequestsAllStatus[]
).map((value) => ({
    value,
    label: REQUESTS_ALL_STATUS_LABEL[value],
}));
