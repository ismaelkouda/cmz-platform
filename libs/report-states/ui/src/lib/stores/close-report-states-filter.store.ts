import { Injectable, signal } from '@angular/core';
import { CloseReportStatesFilterContract } from '@cmz/report-states-domain';
import { CLOSE_REPORT_STATES_FILTER_KEYS } from '../constants/close-report-states-filter-keys.constant';
import {
    reportTypeFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/report-states-filter-wire.util';

@Injectable()
export class CloseReportStatesFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [CLOSE_REPORT_STATES_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [CLOSE_REPORT_STATES_FILTER_KEYS.UNIQ_ID]: '',
            [CLOSE_REPORT_STATES_FILTER_KEYS.REPORT_TYPE]: '',
            [CLOSE_REPORT_STATES_FILTER_KEYS.OPERATORS]: '',
            [CLOSE_REPORT_STATES_FILTER_KEYS.SOURCE]: '',
            [CLOSE_REPORT_STATES_FILTER_KEYS.START_DATE]: '',
            [CLOSE_REPORT_STATES_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): CloseReportStatesFilterContract {
        const m = this.model();
        const reportType = m[CLOSE_REPORT_STATES_FILTER_KEYS.REPORT_TYPE];
        const start = m[CLOSE_REPORT_STATES_FILTER_KEYS.START_DATE];
        const end = m[CLOSE_REPORT_STATES_FILTER_KEYS.END_DATE];
        const operatorsRaw = m[CLOSE_REPORT_STATES_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;

        return {
            initiatorPhoneNumber:
                m[CLOSE_REPORT_STATES_FILTER_KEYS.INITIATOR_PHONE_NUMBER] ||
                undefined,
            uniqId: m[CLOSE_REPORT_STATES_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[CLOSE_REPORT_STATES_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
