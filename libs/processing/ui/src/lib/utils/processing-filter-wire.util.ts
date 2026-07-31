import {
    isReportType,
    isTelecomOperator,
    ReportType,
    TelecomOperator,
} from '@cmz/shared-domain';
import {
    isProcessingAllState,
    ProcessingAllState,
} from '@cmz/processing-domain';

/** Parse une valeur filtre UI → `ReportType` (projection store → contract). */
export function reportTypeFromFilterValue(
    value: string | undefined
): ReportType | undefined {
    if (!value || !isReportType(value)) {
        return undefined;
    }
    return value;
}

/** Parse des valeurs filtre UI → `TelecomOperator[]`. */
export function telecomOperatorsFromFilterValue(
    values: string[] | undefined
): TelecomOperator[] | undefined {
    if (!values?.length) {
        return undefined;
    }
    const parsed = values.filter(isTelecomOperator);
    return parsed.length ? parsed : undefined;
}

/** Parse une valeur filtre UI → `ProcessingAllState`. */
export function processingAllStateFromFilterValue(
    value: string | undefined
): ProcessingAllState | undefined {
    if (!value || !isProcessingAllState(value)) {
        return undefined;
    }
    return value;
}
