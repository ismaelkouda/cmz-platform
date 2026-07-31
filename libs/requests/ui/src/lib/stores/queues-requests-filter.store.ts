import { Injectable, signal } from '@angular/core';
import { QueuesRequestsFilterContract } from '@cmz/requests-domain';
import { QUEUES_REQUESTS_FILTER_KEYS } from '../constants/queues-requests-filter-keys.constant';
import {
    reportTypeFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/requests-filter-wire.util';

@Injectable()
export class QueuesRequestsFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [QUEUES_REQUESTS_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [QUEUES_REQUESTS_FILTER_KEYS.UNIQ_ID]: '',
            [QUEUES_REQUESTS_FILTER_KEYS.REPORT_TYPE]: '',
            [QUEUES_REQUESTS_FILTER_KEYS.OPERATORS]: '',
            [QUEUES_REQUESTS_FILTER_KEYS.SOURCE]: '',
            [QUEUES_REQUESTS_FILTER_KEYS.START_DATE]: '',
            [QUEUES_REQUESTS_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): QueuesRequestsFilterContract {
        const m = this.model();
        const reportType = m[QUEUES_REQUESTS_FILTER_KEYS.REPORT_TYPE];
        const start = m[QUEUES_REQUESTS_FILTER_KEYS.START_DATE];
        const end = m[QUEUES_REQUESTS_FILTER_KEYS.END_DATE];
        const operatorsRaw = m[QUEUES_REQUESTS_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;

        return {
            initiatorPhoneNumber:
                m[QUEUES_REQUESTS_FILTER_KEYS.INITIATOR_PHONE_NUMBER] ||
                undefined,
            uniqId: m[QUEUES_REQUESTS_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[QUEUES_REQUESTS_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
