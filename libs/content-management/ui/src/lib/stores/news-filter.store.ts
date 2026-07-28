import { Injectable, signal } from '@angular/core';
import {
    NewsFilterContract,
    isNewsStatus,
} from '@cmz/content-management-domain';
import { NEWS_FILTER_KEYS } from '../constants/news-filter-keys.constant';

@Injectable()
export class NewsFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [NEWS_FILTER_KEYS.SEARCH]: '',
            [NEWS_FILTER_KEYS.STATUS]: '',
            [NEWS_FILTER_KEYS.START_DATE]: '',
            [NEWS_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): NewsFilterContract {
        const m = this.model();
        const status = m[NEWS_FILTER_KEYS.STATUS];
        const start = m[NEWS_FILTER_KEYS.START_DATE];
        const end = m[NEWS_FILTER_KEYS.END_DATE];
        return {
            search: m[NEWS_FILTER_KEYS.SEARCH] || undefined,
            status: isNewsStatus(status) ? status : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
