import { Injectable, signal } from '@angular/core';
import { SiteGroupFilterContract, isStatus } from '@cmz/coverage-areas-domain';
import { SITE_GROUP_FILTER_KEYS } from '../constants/site-group-filter-keys.constant';

/**
 * Store de filtre `site-group` — **signal-first** (remplace le
 * `FormGroup`/`FormBuilder` du source). Détient le modèle deux-voies consommé
 * par `cmz-filter` et le projette vers le contrat domaine (dates typées).
 * Fourni au niveau composant (`providers`), d'où `@Injectable()` (non-root).
 */
@Injectable()
export class SiteGroupFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [SITE_GROUP_FILTER_KEYS.SEARCH]: '',
            [SITE_GROUP_FILTER_KEYS.STATUS]: '',
            [SITE_GROUP_FILTER_KEYS.START_DATE]: '',
            [SITE_GROUP_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): SiteGroupFilterContract {
        const m = this.model();
        const start = m[SITE_GROUP_FILTER_KEYS.START_DATE];
        const end = m[SITE_GROUP_FILTER_KEYS.END_DATE];
        const status = m[SITE_GROUP_FILTER_KEYS.STATUS];
        return {
            search: m[SITE_GROUP_FILTER_KEYS.SEARCH] || undefined,
            status: isStatus(status) ? status : undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
