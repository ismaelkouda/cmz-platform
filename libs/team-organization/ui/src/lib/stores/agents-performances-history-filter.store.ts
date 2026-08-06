import { Injectable, signal } from '@angular/core';
import { AgentsPerformancesHistoryFilterContract } from '@cmz/team-organization-domain';
import { AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS } from '../constants/agents-performances-history-filter-keys.constant';

@Injectable()
export class AgentsPerformancesHistoryFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.SEARCH]: '',
            [AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.REPORT_TYPE]: '',
            [AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.OPERATORS]: '',
            [AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.START_DATE]: '',
            [AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(uniqId: string | null): AgentsPerformancesHistoryFilterContract {
        const m = this.model();
        const start = m[AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.START_DATE];
        const end = m[AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.END_DATE];
        const operatorsRaw =
            m[AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.OPERATORS];

        return {
            uniqId: uniqId ?? undefined,
            search:
                m[AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.SEARCH] || undefined,
            reportType:
                m[AGENTS_PERFORMANCES_HISTORY_FILTER_KEYS.REPORT_TYPE] ||
                undefined,
            operators: operatorsRaw
                ? operatorsRaw
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean)
                : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
