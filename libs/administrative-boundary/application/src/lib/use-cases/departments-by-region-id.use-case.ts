import { Service, inject } from '@angular/core';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    DepartmentsByRegionIdEntity,
    DepartmentsByRegionIdFilterContract,
    DepartmentsByRegionIdRepository,
    departmentsByRegionIdFilterEntity,
    departmentsByRegionIdFilterVo,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

/** Vue imbriquée « départements d'une région » — lecture seule. */
@Service()
export class DepartmentsByRegionIdUseCase {
    private readonly repository = inject(DepartmentsByRegionIdRepository);

    execute(
        contract: DepartmentsByRegionIdFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DepartmentsByRegionIdEntity>> {
        return defer(() =>
            this.repository.execute(
                departmentsByRegionIdFilterEntity(
                    departmentsByRegionIdFilterVo(contract)
                ),
                page,
                options
            )
        );
    }
}
