import { Injectable, signal } from '@angular/core';
import {
    LegalNoticeFilterContract,
    isLegalNoticeStatus,
} from '@cmz/content-management-domain';
import { LEGAL_NOTICE_FILTER_KEYS } from '../constants/legal-notice-filter-keys.constant';

@Injectable()
export class LegalNoticeFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [LEGAL_NOTICE_FILTER_KEYS.SEARCH]: '',
            [LEGAL_NOTICE_FILTER_KEYS.VERSION]: '',
            [LEGAL_NOTICE_FILTER_KEYS.STATUS]: '',
            [LEGAL_NOTICE_FILTER_KEYS.START_DATE]: '',
            [LEGAL_NOTICE_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): LegalNoticeFilterContract {
        const m = this.model();
        const status = m[LEGAL_NOTICE_FILTER_KEYS.STATUS];
        const start = m[LEGAL_NOTICE_FILTER_KEYS.START_DATE];
        const end = m[LEGAL_NOTICE_FILTER_KEYS.END_DATE];
        return {
            search: m[LEGAL_NOTICE_FILTER_KEYS.SEARCH] || undefined,
            version: m[LEGAL_NOTICE_FILTER_KEYS.VERSION] || undefined,
            status: isLegalNoticeStatus(status) ? status : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
