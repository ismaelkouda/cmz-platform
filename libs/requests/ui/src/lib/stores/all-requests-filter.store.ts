import { Injectable, signal } from '@angular/core';
import { AllRequestsFilterContract } from '@cmz/requests-domain';
import { ALL_REQUESTS_FILTER_KEYS } from '../constants/all-requests-filter-keys.constant';
import {
    reportTypeFromFilterValue,
    requestsAllStatusFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/requests-filter-wire.util';

@Injectable()
export class AllRequestsFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [ALL_REQUESTS_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [ALL_REQUESTS_FILTER_KEYS.UNIQ_ID]: '',
            [ALL_REQUESTS_FILTER_KEYS.REPORT_TYPE]: '',
            [ALL_REQUESTS_FILTER_KEYS.OPERATORS]: '',
            [ALL_REQUESTS_FILTER_KEYS.SOURCE]: '',
            [ALL_REQUESTS_FILTER_KEYS.START_DATE]: '',
            [ALL_REQUESTS_FILTER_KEYS.END_DATE]: '',
            [ALL_REQUESTS_FILTER_KEYS.STATUS]: '',
        };
    }

    toContract(): AllRequestsFilterContract {
        const m = this.model();
        const reportType = m[ALL_REQUESTS_FILTER_KEYS.REPORT_TYPE];
        const start = m[ALL_REQUESTS_FILTER_KEYS.START_DATE];
        const end = m[ALL_REQUESTS_FILTER_KEYS.END_DATE];
        const status = m[ALL_REQUESTS_FILTER_KEYS.STATUS];
        const operatorsRaw = m[ALL_REQUESTS_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;

        return {
            initiatorPhoneNumber:
                m[ALL_REQUESTS_FILTER_KEYS.INITIATOR_PHONE_NUMBER] || undefined,
            uniqId: m[ALL_REQUESTS_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[ALL_REQUESTS_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
            status: requestsAllStatusFromFilterValue(status || undefined),
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
