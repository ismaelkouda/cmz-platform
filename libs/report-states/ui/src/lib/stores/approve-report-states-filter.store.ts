import { Injectable, signal } from '@angular/core';
import { ApproveReportStatesFilterContract } from '@cmz/report-states-domain';
import { APPROVE_REPORT_STATES_FILTER_KEYS } from '../constants/approve-report-states-filter-keys.constant';
import {
    reportTypeFromFilterValue,
    telecomOperatorsFromFilterValue,
} from '../utils/report-states-filter-wire.util';

@Injectable()
export class ApproveReportStatesFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [APPROVE_REPORT_STATES_FILTER_KEYS.INITIATOR_PHONE_NUMBER]: '',
            [APPROVE_REPORT_STATES_FILTER_KEYS.UNIQ_ID]: '',
            [APPROVE_REPORT_STATES_FILTER_KEYS.REPORT_TYPE]: '',
            [APPROVE_REPORT_STATES_FILTER_KEYS.OPERATORS]: '',
            [APPROVE_REPORT_STATES_FILTER_KEYS.SOURCE]: '',
            [APPROVE_REPORT_STATES_FILTER_KEYS.START_DATE]: '',
            [APPROVE_REPORT_STATES_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): ApproveReportStatesFilterContract {
        const m = this.model();
        const reportType = m[APPROVE_REPORT_STATES_FILTER_KEYS.REPORT_TYPE];
        const start = m[APPROVE_REPORT_STATES_FILTER_KEYS.START_DATE];
        const end = m[APPROVE_REPORT_STATES_FILTER_KEYS.END_DATE];
        const operatorsRaw = m[APPROVE_REPORT_STATES_FILTER_KEYS.OPERATORS];
        const operators = operatorsRaw
            ? operatorsRaw
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean)
            : undefined;

        return {
            initiatorPhoneNumber:
                m[APPROVE_REPORT_STATES_FILTER_KEYS.INITIATOR_PHONE_NUMBER] ||
                undefined,
            uniqId: m[APPROVE_REPORT_STATES_FILTER_KEYS.UNIQ_ID] || undefined,
            reportType: reportTypeFromFilterValue(reportType || undefined),
            operators: telecomOperatorsFromFilterValue(operators),
            source: m[APPROVE_REPORT_STATES_FILTER_KEYS.SOURCE] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
