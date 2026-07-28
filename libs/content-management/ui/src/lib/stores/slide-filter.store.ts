import { Injectable, signal } from '@angular/core';
import {
    SlideFilterContract,
    isSlideStatus,
} from '@cmz/content-management-domain';
import { SLIDE_FILTER_KEYS } from '../constants/slide-filter-keys.constant';

@Injectable()
export class SlideFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [SLIDE_FILTER_KEYS.SEARCH]: '',
            [SLIDE_FILTER_KEYS.STATUS]: '',
            [SLIDE_FILTER_KEYS.START_DATE]: '',
            [SLIDE_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): SlideFilterContract {
        const m = this.model();
        const status = m[SLIDE_FILTER_KEYS.STATUS];
        const start = m[SLIDE_FILTER_KEYS.START_DATE];
        const end = m[SLIDE_FILTER_KEYS.END_DATE];
        return {
            search: m[SLIDE_FILTER_KEYS.SEARCH] || undefined,
            status: isSlideStatus(status) ? status : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
