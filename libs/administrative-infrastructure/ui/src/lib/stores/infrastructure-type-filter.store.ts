import { Injectable, signal } from '@angular/core';
import {
    InfrastructureTypeFilterContract,
    Status,
} from '@cmz/administrative-infrastructure-domain';
import { INFRASTRUCTURE_TYPE_FILTER_KEYS } from '../constants/infrastructure-type-filter-keys.constant';

/**
 * Store de filtre `infrastructure-type` — **signal-first** (remplace le
 * `FormGroup`/`FormBuilder` du source). Détient le modèle deux-voies consommé
 * par `cmz-filter` et le projette vers le contrat domaine (dates typées).
 * Fourni au niveau composant (`providers`), d'où `@Injectable()` (non-root).
 */
@Injectable()
export class InfrastructureTypeFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [INFRASTRUCTURE_TYPE_FILTER_KEYS.SEARCH]: '',
            [INFRASTRUCTURE_TYPE_FILTER_KEYS.STATUS]: '',
            [INFRASTRUCTURE_TYPE_FILTER_KEYS.START_DATE]: '',
            [INFRASTRUCTURE_TYPE_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): InfrastructureTypeFilterContract {
        const m = this.model();
        const start = m[INFRASTRUCTURE_TYPE_FILTER_KEYS.START_DATE];
        const end = m[INFRASTRUCTURE_TYPE_FILTER_KEYS.END_DATE];
        return {
            search: m[INFRASTRUCTURE_TYPE_FILTER_KEYS.SEARCH] || undefined,
            status:
                (m[INFRASTRUCTURE_TYPE_FILTER_KEYS.STATUS] as Status) ||
                undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
