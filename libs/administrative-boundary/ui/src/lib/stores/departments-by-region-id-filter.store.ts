import { Injectable, signal } from '@angular/core';
import { DepartmentsByRegionIdFilterContract } from '@cmz/administrative-boundary-domain';
import { DEPARTMENTS_BY_REGION_ID_FILTER_KEYS } from '../constants/departments-by-region-id-filter-keys.constant';

/**
 * Store de filtre de la vue imbriquée. `regionId` n'est **pas** un champ de ce
 * modèle deux-voies (il vient du paramètre de route, injecté par le composant
 * dans `toContract(regionId)`), seul `search`/dates sont éditables par
 * l'utilisateur.
 */
@Injectable()
export class DepartmentsByRegionIdFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.SEARCH]: '',
            [DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.START_DATE]: '',
            [DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(regionId: string): DepartmentsByRegionIdFilterContract {
        const m = this.model();
        const start = m[DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.START_DATE];
        const end = m[DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.END_DATE];
        return {
            regionId,
            search: m[DEPARTMENTS_BY_REGION_ID_FILTER_KEYS.SEARCH] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
