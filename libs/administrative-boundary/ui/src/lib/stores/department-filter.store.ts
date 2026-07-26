import { Injectable, signal } from '@angular/core';
import { DepartmentFilterContract } from '@cmz/administrative-boundary-domain';
import { DEPARTMENT_FILTER_KEYS } from '../constants/department-filter-keys.constant';

@Injectable()
export class DepartmentFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [DEPARTMENT_FILTER_KEYS.SEARCH]: '',
            [DEPARTMENT_FILTER_KEYS.REGION_ID]: '',
            [DEPARTMENT_FILTER_KEYS.START_DATE]: '',
            [DEPARTMENT_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(): DepartmentFilterContract {
        const m = this.model();
        const start = m[DEPARTMENT_FILTER_KEYS.START_DATE];
        const end = m[DEPARTMENT_FILTER_KEYS.END_DATE];
        return {
            search: m[DEPARTMENT_FILTER_KEYS.SEARCH] || undefined,
            regionId: m[DEPARTMENT_FILTER_KEYS.REGION_ID] || undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
