import { Service, inject } from '@angular/core';
import {
    DepartmentFindOneEntity,
    DepartmentFindOneFilterValidateContract,
    DepartmentFindOneRepository,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { departmentFindOneFilterMapper } from '../mappers/department-find-one-filter.mapper';
import { DepartmentFindOneMapper } from '../mappers/department-find-one.mapper';
import { DepartmentFindOneApi } from '../sources/department-find-one.api';

@Service()
export class DepartmentFindOneRepositoryImpl implements DepartmentFindOneRepository {
    private readonly api = inject(DepartmentFindOneApi);
    private readonly mapper = inject(DepartmentFindOneMapper);

    execute(
        filter: DepartmentFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<DepartmentFindOneEntity> {
        const dto = departmentFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
