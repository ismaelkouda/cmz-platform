import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    DepartmentFindOneEntity,
    DepartmentFindOneFilterContract,
    DepartmentFindOneRepository,
    departmentFindOneFilterVo,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class DepartmentFindOneUseCase {
    private readonly repository = inject(DepartmentFindOneRepository);

    execute(
        contract: DepartmentFindOneFilterContract,
        options?: FetchOptions
    ): Observable<DepartmentFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                departmentFindOneFilterVo(contract),
                options
            )
        );
    }
}
