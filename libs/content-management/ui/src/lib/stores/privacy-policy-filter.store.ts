import { Injectable, signal } from '@angular/core';
import {
    PrivacyPolicyFilterContract,
    isPrivacyPolicyStatus,
} from '@cmz/content-management-domain';
import { PRIVACY_POLICY_FILTER_KEYS } from '../constants/privacy-policy-filter-keys.constant';

@Injectable()
export class PrivacyPolicyFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [PRIVACY_POLICY_FILTER_KEYS.SEARCH]: '',
            [PRIVACY_POLICY_FILTER_KEYS.VERSION]: '',
            [PRIVACY_POLICY_FILTER_KEYS.STATUS]: '',
            [PRIVACY_POLICY_FILTER_KEYS.START_DATE]: '',
            [PRIVACY_POLICY_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): PrivacyPolicyFilterContract {
        const m = this.model();
        const status = m[PRIVACY_POLICY_FILTER_KEYS.STATUS];
        const start = m[PRIVACY_POLICY_FILTER_KEYS.START_DATE];
        const end = m[PRIVACY_POLICY_FILTER_KEYS.END_DATE];
        return {
            search: m[PRIVACY_POLICY_FILTER_KEYS.SEARCH] || undefined,
            version: m[PRIVACY_POLICY_FILTER_KEYS.VERSION] || undefined,
            status: isPrivacyPolicyStatus(status) ? status : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
