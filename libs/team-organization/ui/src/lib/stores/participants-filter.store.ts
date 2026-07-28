import { Injectable, signal } from '@angular/core';
import { isRole } from '@cmz/shared-domain';
import {
    ParticipantsFilterContract,
    isParticipantsStatus,
} from '@cmz/team-organization-domain';
import { PARTICIPANTS_FILTER_KEYS } from '../constants/participants-filter-keys.constant';

/**
 * Store de filtre `participants` — signal-first. Pas de plage de dates
 * ici (contrairement à `site-group`) : `team` est un select alimenté par
 * `TeamsSelectFacade` côté composant.
 */
@Injectable()
export class ParticipantsFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [PARTICIPANTS_FILTER_KEYS.SEARCH]: '',
            [PARTICIPANTS_FILTER_KEYS.ROLE]: '',
            [PARTICIPANTS_FILTER_KEYS.TEAM]: '',
            [PARTICIPANTS_FILTER_KEYS.STATUS]: '',
        };
    }

    toContract(): ParticipantsFilterContract {
        const m = this.model();
        const role = m[PARTICIPANTS_FILTER_KEYS.ROLE];
        const status = m[PARTICIPANTS_FILTER_KEYS.STATUS];
        return {
            search: m[PARTICIPANTS_FILTER_KEYS.SEARCH] || undefined,
            role: isRole(role) ? role : undefined,
            team: m[PARTICIPANTS_FILTER_KEYS.TEAM] || undefined,
            status: isParticipantsStatus(status) ? status : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
