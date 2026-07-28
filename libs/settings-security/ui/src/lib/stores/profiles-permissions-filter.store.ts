import { Injectable, signal } from '@angular/core';
import {
    ProfilesPermissionsFilterContract,
    isProfilesPermissionsStatus,
} from '@cmz/settings-security-domain';
import { PROFILES_PERMISSIONS_FILTER_KEYS } from '../constants/profiles-permissions-filter-keys.constant';

@Injectable()
export class ProfilesPermissionsFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [PROFILES_PERMISSIONS_FILTER_KEYS.SEARCH]: '',
            [PROFILES_PERMISSIONS_FILTER_KEYS.USER]: '',
            [PROFILES_PERMISSIONS_FILTER_KEYS.STATUS]: '',
        };
    }

    toContract(): ProfilesPermissionsFilterContract {
        const m = this.model();
        const status = m[PROFILES_PERMISSIONS_FILTER_KEYS.STATUS];
        return {
            search: m[PROFILES_PERMISSIONS_FILTER_KEYS.SEARCH] || undefined,
            user: m[PROFILES_PERMISSIONS_FILTER_KEYS.USER] || undefined,
            status: isProfilesPermissionsStatus(status) ? status : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
