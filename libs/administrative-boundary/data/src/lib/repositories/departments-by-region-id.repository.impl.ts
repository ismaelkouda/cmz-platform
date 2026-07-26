import { Service, inject } from '@angular/core';
import {
    DepartmentsByRegionIdEntity,
    DepartmentsByRegionIdFilterValidateContract,
    DepartmentsByRegionIdRepository,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { departmentsByRegionIdFilterMapper } from '../mappers/departments-by-region-id-filter.mapper';
import { DepartmentsByRegionIdMapper } from '../mappers/departments-by-region-id.mapper';
import { DepartmentsByRegionIdApi } from '../sources/departments-by-region-id.api';

@Service()
export class DepartmentsByRegionIdRepositoryImpl implements DepartmentsByRegionIdRepository {
    private readonly api = inject(DepartmentsByRegionIdApi);
    private readonly mapper = inject(DepartmentsByRegionIdMapper);

    execute(
        filter: DepartmentsByRegionIdFilterValidateContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DepartmentsByRegionIdEntity>> {
        return this.api
            .readAll(departmentsByRegionIdFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
