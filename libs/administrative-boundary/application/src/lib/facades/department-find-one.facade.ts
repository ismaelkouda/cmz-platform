import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    DepartmentFindOneEntity,
    DepartmentFindOneFilterContract,
} from '@cmz/administrative-boundary-domain';
import { DepartmentFindOneUseCase } from '../use-cases/department-find-one.use-case';
import { Observable } from 'rxjs';

interface DepartmentFindOneParams {
    filter: DepartmentFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class DepartmentFindOneFacade extends ResourceFacade<
    DepartmentFindOneEntity,
    DepartmentFindOneParams
> {
    private readonly useCase = inject(DepartmentFindOneUseCase);

    protected stream(
        params: DepartmentFindOneParams
    ): Observable<DepartmentFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: DepartmentFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
