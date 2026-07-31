import {
    isReportType,
    isTelecomOperator,
    ReportType,
    TelecomOperator,
} from '@cmz/shared-domain';
import {
    isFinalizationAllState,
    FinalizationAllState,
} from '@cmz/finalization-domain';

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

export function finalizationAllStateFromFilterValue(
    value: string | undefined
): FinalizationAllState | undefined {
    if (!value || !isFinalizationAllState(value)) {
        return undefined;
    }
    return value;
}
