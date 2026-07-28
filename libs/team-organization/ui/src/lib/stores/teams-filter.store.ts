import { Injectable, signal } from '@angular/core';
import {
    TeamsFilterContract,
    isTeamsStatus,
} from '@cmz/team-organization-domain';
import { TEAMS_FILTER_KEYS } from '../constants/teams-filter-keys.constant';

@Injectable()
export class TeamsFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [TEAMS_FILTER_KEYS.SEARCH]: '',
            [TEAMS_FILTER_KEYS.STATUS]: '',
        };
    }

    toContract(): TeamsFilterContract {
        const m = this.model();
        const status = m[TEAMS_FILTER_KEYS.STATUS];
        return {
            search: m[TEAMS_FILTER_KEYS.SEARCH] || undefined,
            status: isTeamsStatus(status) ? status : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
