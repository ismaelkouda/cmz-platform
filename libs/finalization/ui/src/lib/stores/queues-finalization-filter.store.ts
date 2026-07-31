import { Injectable, signal } from '@angular/core';
import { QueuesFinalizationFilterContract } from '@cmz/finalization-domain';
import { QUEUES_FINALIZATION_FILTER_KEYS } from '../constants/queues-finalization-filter-keys.constant';
import {
    reportTypeFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/finalization-filter-wire.util';

@Injectable()
export class QueuesFinalizationFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [QUEUES_FINALIZATION_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [QUEUES_FINALIZATION_FILTER_KEYS.UNIQ_ID]: '',
            [QUEUES_FINALIZATION_FILTER_KEYS.REPORT_TYPE]: '',
            [QUEUES_FINALIZATION_FILTER_KEYS.OPERATORS]: '',
            [QUEUES_FINALIZATION_FILTER_KEYS.SOURCE]: '',
            [QUEUES_FINALIZATION_FILTER_KEYS.START_DATE]: '',
            [QUEUES_FINALIZATION_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): QueuesFinalizationFilterContract {
        const m = this.model();
        const reportType = m[QUEUES_FINALIZATION_FILTER_KEYS.REPORT_TYPE];
        const start = m[QUEUES_FINALIZATION_FILTER_KEYS.START_DATE];
        const end = m[QUEUES_FINALIZATION_FILTER_KEYS.END_DATE];
        const operatorsRaw = m[QUEUES_FINALIZATION_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;

        return {
            initiatorPhoneNumber:
                m[QUEUES_FINALIZATION_FILTER_KEYS.INITIATOR_PHONE_NUMBER] ||
                undefined,
            uniqId: m[QUEUES_FINALIZATION_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[QUEUES_FINALIZATION_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
