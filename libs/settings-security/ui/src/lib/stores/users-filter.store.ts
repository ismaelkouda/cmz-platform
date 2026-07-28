import { Injectable, signal } from '@angular/core';
import { isRole } from '@cmz/shared-domain';
import {
    UsersFilterContract,
    isUsersStatus,
} from '@cmz/settings-security-domain';
import { USERS_FILTER_KEYS } from '../constants/users-filter-keys.constant';

/**
 * Store de filtre `users` — signal-first, même pattern que
 * `team-organization/participants-filter.store.ts`. `profile` est un
 * select alimenté par `ProfilesPermissionsSelectFacade` côté composant.
 */
@Injectable()
export class UsersFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [USERS_FILTER_KEYS.SEARCH]: '',
            [USERS_FILTER_KEYS.PROFILE]: '',
            [USERS_FILTER_KEYS.ROLE]: '',
            [USERS_FILTER_KEYS.STATUS]: '',
        };
    }

    toContract(): UsersFilterContract {
        const m = this.model();
        const role = m[USERS_FILTER_KEYS.ROLE];
        const status = m[USERS_FILTER_KEYS.STATUS];
        return {
            search: m[USERS_FILTER_KEYS.SEARCH] || undefined,
            profile: m[USERS_FILTER_KEYS.PROFILE] || undefined,
            role: isRole(role) ? role : undefined,
            status: isUsersStatus(status) ? status : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
