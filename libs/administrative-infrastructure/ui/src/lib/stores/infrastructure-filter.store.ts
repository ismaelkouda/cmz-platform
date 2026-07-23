import { Injectable, signal } from '@angular/core';
import { InfrastructureFilterContract } from '@cmz/administrative-infrastructure-domain';
import { INFRASTRUCTURE_FILTER_KEYS } from '../constants/infrastructure-filter-keys.constant';

/**
 * Store de filtre `infrastructure` — signal-first. Modèle `Record` deux-voies
 * (consommé par `cmz-filter`) projeté vers le contrat domaine (dates typées).
 */
@Injectable()
export class InfrastructureFilterStore {
    readonly model = signal<Record<string, string>>({});

    toContract(): InfrastructureFilterContract {
        const m = this.model();
        const start = m[INFRASTRUCTURE_FILTER_KEYS.START_DATE];
        const end = m[INFRASTRUCTURE_FILTER_KEYS.END_DATE];
        return {
            search: m[INFRASTRUCTURE_FILTER_KEYS.SEARCH] || undefined,
            type: m[INFRASTRUCTURE_FILTER_KEYS.TYPE] || undefined,
            region: m[INFRASTRUCTURE_FILTER_KEYS.REGION] || undefined,
            department: m[INFRASTRUCTURE_FILTER_KEYS.DEPARTMENT] || undefined,
            municipality:
                m[INFRASTRUCTURE_FILTER_KEYS.MUNICIPALITY] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set({});
    }
}
