import { Injectable, signal } from '@angular/core';
import { AllFinalizationFilterContract } from '@cmz/finalization-domain';
import { ALL_FINALIZATION_FILTER_KEYS } from '../constants/all-finalization-filter-keys.constant';
import {
    reportTypeFromFilterValue,
    finalizationAllStateFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/finalization-filter-wire.util';

@Injectable()
export class AllFinalizationFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [ALL_FINALIZATION_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [ALL_FINALIZATION_FILTER_KEYS.UNIQ_ID]: '',
            [ALL_FINALIZATION_FILTER_KEYS.REPORT_TYPE]: '',
            [ALL_FINALIZATION_FILTER_KEYS.OPERATORS]: '',
            [ALL_FINALIZATION_FILTER_KEYS.SOURCE]: '',
            [ALL_FINALIZATION_FILTER_KEYS.START_DATE]: '',
            [ALL_FINALIZATION_FILTER_KEYS.END_DATE]: '',
            [ALL_FINALIZATION_FILTER_KEYS.STATE]: '',
        };
    }

    toContract(): AllFinalizationFilterContract {
        const m = this.model();
        const reportType = m[ALL_FINALIZATION_FILTER_KEYS.REPORT_TYPE];
        const start = m[ALL_FINALIZATION_FILTER_KEYS.START_DATE];
        const end = m[ALL_FINALIZATION_FILTER_KEYS.END_DATE];
        const state = m[ALL_FINALIZATION_FILTER_KEYS.STATE];
        const operatorsRaw = m[ALL_FINALIZATION_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;

        return {
            initiatorPhoneNumber:
                m[ALL_FINALIZATION_FILTER_KEYS.INITIATOR_PHONE_NUMBER] ||
                undefined,
            uniqId: m[ALL_FINALIZATION_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[ALL_FINALIZATION_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
            state: finalizationAllStateFromFilterValue(state || undefined),
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
