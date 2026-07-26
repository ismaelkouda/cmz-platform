import { Injectable, signal } from '@angular/core';
import { MunicipalityFilterContract } from '@cmz/administrative-boundary-domain';
import { MUNICIPALITY_FILTER_KEYS } from '../constants/municipality-filter-keys.constant';

@Injectable()
export class MunicipalityFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [MUNICIPALITY_FILTER_KEYS.SEARCH]: '',
            [MUNICIPALITY_FILTER_KEYS.REGION_ID]: '',
            [MUNICIPALITY_FILTER_KEYS.DEPARTMENT_ID]: '',
            [MUNICIPALITY_FILTER_KEYS.START_DATE]: '',
            [MUNICIPALITY_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): MunicipalityFilterContract {
        const m = this.model();
        const start = m[MUNICIPALITY_FILTER_KEYS.START_DATE];
        const end = m[MUNICIPALITY_FILTER_KEYS.END_DATE];
        return {
            search: m[MUNICIPALITY_FILTER_KEYS.SEARCH] || undefined,
            regionId: m[MUNICIPALITY_FILTER_KEYS.REGION_ID] || undefined,
            departmentId:
                m[MUNICIPALITY_FILTER_KEYS.DEPARTMENT_ID] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
