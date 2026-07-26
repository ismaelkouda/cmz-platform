import { Service, inject } from '@angular/core';
import {
    MunicipalitiesByDepartmentIdEntity,
    MunicipalitiesByDepartmentIdFilterValidateContract,
    MunicipalitiesByDepartmentIdRepository,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { municipalitiesByDepartmentIdFilterMapper } from '../mappers/municipalities-by-department-id-filter.mapper';
import { MunicipalitiesByDepartmentIdMapper } from '../mappers/municipalities-by-department-id.mapper';
import { MunicipalitiesByDepartmentIdApi } from '../sources/municipalities-by-department-id.api';

@Service()
export class MunicipalitiesByDepartmentIdRepositoryImpl implements MunicipalitiesByDepartmentIdRepository {
    private readonly api = inject(MunicipalitiesByDepartmentIdApi);
    private readonly mapper = inject(MunicipalitiesByDepartmentIdMapper);

    execute(
        filter: MunicipalitiesByDepartmentIdFilterValidateContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MunicipalitiesByDepartmentIdEntity>> {
        return this.api
            .readAll(
                municipalitiesByDepartmentIdFilterMapper(filter),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
