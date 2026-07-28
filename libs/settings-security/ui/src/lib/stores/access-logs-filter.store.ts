import { Injectable, signal } from '@angular/core';
import {
    AccessLogsFilterContract,
    isAccessLogsAction,
} from '@cmz/settings-security-domain';
import { ACCESS_LOGS_FILTER_KEYS } from '../constants/access-logs-filter-keys.constant';

@Injectable()
export class AccessLogsFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [ACCESS_LOGS_FILTER_KEYS.SEARCH]: '',
            [ACCESS_LOGS_FILTER_KEYS.ACTION]: '',
            [ACCESS_LOGS_FILTER_KEYS.START_DATE]: '',
            [ACCESS_LOGS_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): AccessLogsFilterContract {
        const m = this.model();
        const action = m[ACCESS_LOGS_FILTER_KEYS.ACTION];
        const start = m[ACCESS_LOGS_FILTER_KEYS.START_DATE];
        const end = m[ACCESS_LOGS_FILTER_KEYS.END_DATE];
        return {
            search: m[ACCESS_LOGS_FILTER_KEYS.SEARCH] || undefined,
            action: isAccessLogsAction(action) ? action : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
