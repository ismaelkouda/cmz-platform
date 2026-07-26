import { Service, inject } from '@angular/core';
import {
    DepartmentOption,
    DepartmentSelectRepository,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { DepartmentSelectMapper } from '../mappers/department-select.mapper';
import { DepartmentSelectApi } from '../sources/department-select.api';

@Service()
export class DepartmentSelectRepositoryImpl implements DepartmentSelectRepository {
    private readonly api = inject(DepartmentSelectApi);
    private readonly mapper = inject(DepartmentSelectMapper);

    readAll(options?: FetchOptions): Observable<DepartmentOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
