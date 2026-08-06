import { Injectable, signal } from '@angular/core';
import { DailyGoalFilterContract } from '@cmz/team-organization-domain';
import { DAILY_GOAL_FILTER_KEYS } from '../constants/daily-goal-filter-keys.constant';

@Injectable()
export class DailyGoalFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [DAILY_GOAL_FILTER_KEYS.START_DATE]: '',
            [DAILY_GOAL_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): DailyGoalFilterContract {
        const m = this.model();
        const start = m[DAILY_GOAL_FILTER_KEYS.START_DATE];
        const end = m[DAILY_GOAL_FILTER_KEYS.END_DATE];

        return {
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
