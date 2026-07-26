import { Service, inject } from '@angular/core';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    DepartmentsByRegionIdEntity,
    DepartmentsByRegionIdFilterContract,
} from '@cmz/administrative-boundary-domain';
import { DepartmentsByRegionIdUseCase } from '../use-cases/departments-by-region-id.use-case';

/**
 * Vue imbriquée « départements d'une région » — lecture seule (pas de
 * mutation, donc `PaginatedResourceFacade` et non `CollectionResourceFacade`
 * qui ajoute `runAction`/notifications pour des mutations inexistantes ici).
 */
@Service()
export class DepartmentsByRegionIdFacade extends PaginatedResourceFacade<
    DepartmentsByRegionIdEntity,
    DepartmentsByRegionIdFilterContract
> {
    private readonly useCase = inject(DepartmentsByRegionIdUseCase);

    protected stream(
        params: PageQuery<DepartmentsByRegionIdFilterContract>
    ): Observable<PageResult<DepartmentsByRegionIdEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }
}
