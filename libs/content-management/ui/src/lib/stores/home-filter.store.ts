import { Injectable, signal } from '@angular/core';
import {
    HomeFilterContract,
    isHomeStatus,
} from '@cmz/content-management-domain';
import { HOME_FILTER_KEYS } from '../constants/home-filter-keys.constant';

@Injectable()
export class HomeFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [HOME_FILTER_KEYS.SEARCH]: '',
            [HOME_FILTER_KEYS.STATUS]: '',
            [HOME_FILTER_KEYS.START_DATE]: '',
            [HOME_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): HomeFilterContract {
        const m = this.model();
        const status = m[HOME_FILTER_KEYS.STATUS];
        const start = m[HOME_FILTER_KEYS.START_DATE];
        const end = m[HOME_FILTER_KEYS.END_DATE];
        return {
            search: m[HOME_FILTER_KEYS.SEARCH] || undefined,
            status: isHomeStatus(status) ? status : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
