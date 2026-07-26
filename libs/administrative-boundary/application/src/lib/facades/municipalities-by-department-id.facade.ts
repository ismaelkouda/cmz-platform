import { Service, inject } from '@angular/core';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    MunicipalitiesByDepartmentIdEntity,
    MunicipalitiesByDepartmentIdFilterContract,
} from '@cmz/administrative-boundary-domain';
import { MunicipalitiesByDepartmentIdUseCase } from '../use-cases/municipalities-by-department-id.use-case';

/** Vue imbriquée « communes d'un département » — lecture seule. */
@Service()
export class MunicipalitiesByDepartmentIdFacade extends PaginatedResourceFacade<
    MunicipalitiesByDepartmentIdEntity,
    MunicipalitiesByDepartmentIdFilterContract
> {
    private readonly useCase = inject(MunicipalitiesByDepartmentIdUseCase);

    protected stream(
        params: PageQuery<MunicipalitiesByDepartmentIdFilterContract>
    ): Observable<PageResult<MunicipalitiesByDepartmentIdEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }
}
