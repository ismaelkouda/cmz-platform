import { Injectable, signal } from '@angular/core';
import { RejectReportStatesFilterContract } from '@cmz/report-states-domain';
import { REJECT_REPORT_STATES_FILTER_KEYS } from '../constants/reject-report-states-filter-keys.constant';
import {
    reportTypeFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/report-states-filter-wire.util';

@Injectable()
export class RejectReportStatesFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [REJECT_REPORT_STATES_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [REJECT_REPORT_STATES_FILTER_KEYS.UNIQ_ID]: '',
            [REJECT_REPORT_STATES_FILTER_KEYS.REPORT_TYPE]: '',
            [REJECT_REPORT_STATES_FILTER_KEYS.OPERATORS]: '',
            [REJECT_REPORT_STATES_FILTER_KEYS.SOURCE]: '',
            [REJECT_REPORT_STATES_FILTER_KEYS.START_DATE]: '',
            [REJECT_REPORT_STATES_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): RejectReportStatesFilterContract {
        const m = this.model();
        const reportType = m[REJECT_REPORT_STATES_FILTER_KEYS.REPORT_TYPE];
        const start = m[REJECT_REPORT_STATES_FILTER_KEYS.START_DATE];
        const end = m[REJECT_REPORT_STATES_FILTER_KEYS.END_DATE];
        const operatorsRaw = m[REJECT_REPORT_STATES_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;

        return {
            initiatorPhoneNumber:
                m[REJECT_REPORT_STATES_FILTER_KEYS.INITIATOR_PHONE_NUMBER] ||
                undefined,
            uniqId: m[REJECT_REPORT_STATES_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[REJECT_REPORT_STATES_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
