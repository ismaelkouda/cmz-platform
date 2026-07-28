import { Injectable, signal } from '@angular/core';
import {
    TermsUseFilterContract,
    isTermsUseStatus,
} from '@cmz/content-management-domain';
import { TERMS_USE_FILTER_KEYS } from '../constants/terms-use-filter-keys.constant';

@Injectable()
export class TermsUseFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [TERMS_USE_FILTER_KEYS.SEARCH]: '',
            [TERMS_USE_FILTER_KEYS.VERSION]: '',
            [TERMS_USE_FILTER_KEYS.STATUS]: '',
            [TERMS_USE_FILTER_KEYS.START_DATE]: '',
            [TERMS_USE_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): TermsUseFilterContract {
        const m = this.model();
        const status = m[TERMS_USE_FILTER_KEYS.STATUS];
        const start = m[TERMS_USE_FILTER_KEYS.START_DATE];
        const end = m[TERMS_USE_FILTER_KEYS.END_DATE];
        return {
            search: m[TERMS_USE_FILTER_KEYS.SEARCH] || undefined,
            version: m[TERMS_USE_FILTER_KEYS.VERSION] || undefined,
            status: isTermsUseStatus(status) ? status : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
