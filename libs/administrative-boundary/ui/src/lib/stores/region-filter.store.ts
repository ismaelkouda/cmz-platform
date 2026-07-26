import { Injectable, signal } from '@angular/core';
import { RegionFilterContract } from '@cmz/administrative-boundary-domain';
import { REGION_FILTER_KEYS } from '../constants/region-filter-keys.constant';

/**
 * Store de filtre `region` — signal-first. Pas de champ `status` (jugé
 * explicitement absent côté source, cf. `RegionFilterContract`).
 */
@Injectable()
export class RegionFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [REGION_FILTER_KEYS.SEARCH]: '',
            [REGION_FILTER_KEYS.START_DATE]: '',
            [REGION_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): RegionFilterContract {
        const m = this.model();
        const start = m[REGION_FILTER_KEYS.START_DATE];
        const end = m[REGION_FILTER_KEYS.END_DATE];
        return {
            search: m[REGION_FILTER_KEYS.SEARCH] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
