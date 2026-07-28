import { Injectable, signal } from '@angular/core';
import {
    MessagingFilterContract,
    isMessagingTarget,
} from '@cmz/communication-domain';
import { MESSAGING_FILTER_KEYS } from '../constants/messaging-filter-keys.constant';

/**
 * Store de filtre `messaging` — même pattern signal-first que
 * `settings-security/users-filter.store.ts`. `region`/`department`/
 * `municipality`/`reportId`/`channels` existent dans le contrat domaine
 * mais ne sont pas exposés en filtre (cf. `MESSAGING_FILTER_KEYS`).
 */
@Injectable()
export class MessagingFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [MESSAGING_FILTER_KEYS.SEARCH]: '',
            [MESSAGING_FILTER_KEYS.TARGET_TYPE]: '',
        };
    }

    toContract(): MessagingFilterContract {
        const m = this.model();
        const targetType = m[MESSAGING_FILTER_KEYS.TARGET_TYPE];
        return {
            search: m[MESSAGING_FILTER_KEYS.SEARCH] || undefined,
            targetType: isMessagingTarget(targetType) ? targetType : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
