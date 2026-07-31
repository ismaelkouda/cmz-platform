import {
    isReportType,
    isTelecomOperator,
    ReportType,
    TelecomOperator,
} from '@cmz/shared-domain';
import { isRequestsAllStatus, RequestsAllStatus } from '@cmz/requests-domain';

export function reportTypeFromFilterValue(
    value: string | undefined
): ReportType | undefined {
    if (!value || !isReportType(value)) {
        return undefined;
    }
    return value;
}

export function telecomOperatorsFromFilterValue(
    values: string[] | undefined
): TelecomOperator[] | undefined {
    if (!values?.length) {
        return undefined;
    }
    const parsed = values.filter(isTelecomOperator);
    return parsed.length ? parsed : undefined;
}

export function requestsAllStatusFromFilterValue(
    value: string | undefined
): RequestsAllStatus | undefined {
    if (!value || !isRequestsAllStatus(value)) {
        return undefined;
    }
    return value;
}
