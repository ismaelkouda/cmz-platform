import { Injectable, signal } from '@angular/core';
import { AgentsPerformancesFilterContract } from '@cmz/team-organization-domain';
import { AGENTS_PERFORMANCES_FILTER_KEYS } from '../constants/agents-performances-filter-keys.constant';

@Injectable()
export class AgentsPerformancesFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [AGENTS_PERFORMANCES_FILTER_KEYS.SEARCH]: '',
            [AGENTS_PERFORMANCES_FILTER_KEYS.MEMBER]: '',
            [AGENTS_PERFORMANCES_FILTER_KEYS.IS_ACHIEVED]: '',
            [AGENTS_PERFORMANCES_FILTER_KEYS.START_DATE]: '',
            [AGENTS_PERFORMANCES_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): AgentsPerformancesFilterContract {
        const m = this.model();
        const start = m[AGENTS_PERFORMANCES_FILTER_KEYS.START_DATE];
        const end = m[AGENTS_PERFORMANCES_FILTER_KEYS.END_DATE];

        return {
            search: m[AGENTS_PERFORMANCES_FILTER_KEYS.SEARCH] || undefined,
            member: m[AGENTS_PERFORMANCES_FILTER_KEYS.MEMBER] || undefined,
            isAchieved:
                m[AGENTS_PERFORMANCES_FILTER_KEYS.IS_ACHIEVED] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
