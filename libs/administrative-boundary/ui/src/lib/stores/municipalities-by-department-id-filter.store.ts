import { Injectable, signal } from '@angular/core';
import { MunicipalitiesByDepartmentIdFilterContract } from '@cmz/administrative-boundary-domain';
import { MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS } from '../constants/municipalities-by-department-id-filter-keys.constant';

@Injectable()
export class MunicipalitiesByDepartmentIdFilterStore {
    readonly model = signal<Record<string, string>>(this.empty());

    private empty(): Record<string, string> {
        return {
            [MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.SEARCH]: '',
            [MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.START_DATE]: '',
            [MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.END_DATE]: '',
        };
    }

    toContract(
        departmentId: string
    ): MunicipalitiesByDepartmentIdFilterContract {
        const m = this.model();
        const start = m[MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.START_DATE];
        const end = m[MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.END_DATE];
        return {
            departmentId,
            search:
                m[MUNICIPALITIES_BY_DEPARTMENT_ID_FILTER_KEYS.SEARCH] ||
                undefined,
            startDate: start ? new Date(start) : undefined,
            endDate: end ? new Date(end) : undefined,
        };
    }

    reset(): void {
        this.model.set(this.empty());
    }
}
