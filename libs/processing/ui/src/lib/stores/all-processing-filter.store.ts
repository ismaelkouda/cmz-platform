import { Injectable, signal } from '@angular/core';
import { AllProcessingFilterContract } from '@cmz/processing-domain';
import { ALL_PROCESSING_FILTER_KEYS } from '../constants/all-processing-filter-keys.constant';
import {
    processingAllStateFromFilterValue,
    reportTypeFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/processing-filter-wire.util';

@Injectable()
export class AllProcessingFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [ALL_PROCESSING_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [ALL_PROCESSING_FILTER_KEYS.UNIQ_ID]: '',
            [ALL_PROCESSING_FILTER_KEYS.REPORT_TYPE]: '',
            [ALL_PROCESSING_FILTER_KEYS.OPERATORS]: '',
            [ALL_PROCESSING_FILTER_KEYS.SOURCE]: '',
            [ALL_PROCESSING_FILTER_KEYS.START_DATE]: '',
            [ALL_PROCESSING_FILTER_KEYS.END_DATE]: '',
            [ALL_PROCESSING_FILTER_KEYS.STATE]: '',
        };
    }

    toContract(): AllProcessingFilterContract {
        const m = this.model();
        const reportType = m[ALL_PROCESSING_FILTER_KEYS.REPORT_TYPE];
        const start = m[ALL_PROCESSING_FILTER_KEYS.START_DATE];
        const end = m[ALL_PROCESSING_FILTER_KEYS.END_DATE];
        const operatorsRaw = m[ALL_PROCESSING_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;
        const state = m[ALL_PROCESSING_FILTER_KEYS.STATE];

        return {
            initiatorPhoneNumber:
                m[ALL_PROCESSING_FILTER_KEYS.INITIATOR_PHONE_NUMBER] ||
                undefined,
            uniqId: m[ALL_PROCESSING_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[ALL_PROCESSING_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
            state: processingAllStateFromFilterValue(state || undefined),
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
