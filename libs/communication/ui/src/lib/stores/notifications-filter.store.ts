import { Injectable, signal } from '@angular/core';
import { isTypeReport } from '@cmz/shared-domain';
import { NotificationsFilterContract } from '@cmz/communication-domain';
import { NOTIFICATIONS_FILTER_KEYS } from '../constants/notifications-filter-keys.constant';

@Injectable()
export class NotificationsFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [NOTIFICATIONS_FILTER_KEYS.SEARCH]: '',
            [NOTIFICATIONS_FILTER_KEYS.TYPE]: '',
            [NOTIFICATIONS_FILTER_KEYS.START_DATE]: '',
            [NOTIFICATIONS_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): NotificationsFilterContract {
        const m = this.model();
        const type = m[NOTIFICATIONS_FILTER_KEYS.TYPE];
        const start = m[NOTIFICATIONS_FILTER_KEYS.START_DATE];
        const end = m[NOTIFICATIONS_FILTER_KEYS.END_DATE];
        return {
            search: m[NOTIFICATIONS_FILTER_KEYS.SEARCH] || undefined,
            type: isTypeReport(type) ? type : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
