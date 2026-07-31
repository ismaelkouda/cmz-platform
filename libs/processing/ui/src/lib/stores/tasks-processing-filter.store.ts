import { Injectable, signal } from '@angular/core';
import { TasksProcessingFilterContract } from '@cmz/processing-domain';
import { TASKS_PROCESSING_FILTER_KEYS } from '../constants/tasks-processing-filter-keys.constant';
import {
    reportTypeFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/processing-filter-wire.util';

@Injectable()
export class TasksProcessingFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [TASKS_PROCESSING_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [TASKS_PROCESSING_FILTER_KEYS.UNIQ_ID]: '',
            [TASKS_PROCESSING_FILTER_KEYS.REPORT_TYPE]: '',
            [TASKS_PROCESSING_FILTER_KEYS.OPERATORS]: '',
            [TASKS_PROCESSING_FILTER_KEYS.SOURCE]: '',
            [TASKS_PROCESSING_FILTER_KEYS.START_DATE]: '',
            [TASKS_PROCESSING_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): TasksProcessingFilterContract {
        const m = this.model();
        const reportType = m[TASKS_PROCESSING_FILTER_KEYS.REPORT_TYPE];
        const start = m[TASKS_PROCESSING_FILTER_KEYS.START_DATE];
        const end = m[TASKS_PROCESSING_FILTER_KEYS.END_DATE];
        const operatorsRaw = m[TASKS_PROCESSING_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;

        return {
            initiatorPhoneNumber:
                m[TASKS_PROCESSING_FILTER_KEYS.INITIATOR_PHONE_NUMBER] ||
                undefined,
            uniqId: m[TASKS_PROCESSING_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[TASKS_PROCESSING_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
