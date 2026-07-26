import { Service, inject } from '@angular/core';
import { CollectionResourceFacade, PageQuery } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import {
    DepartmentCreateContract,
    DepartmentDeleteContract,
    DepartmentEntity,
    DepartmentFilterContract,
    DepartmentUpdateContract,
} from '@cmz/administrative-boundary-domain';
import { DepartmentUseCase } from '../use-cases/department.use-case';

@Service()
export class DepartmentFacade extends CollectionResourceFacade<
    DepartmentEntity,
    DepartmentFilterContract
> {
    private readonly useCase = inject(DepartmentUseCase);

    protected stream(
        params: PageQuery<DepartmentFilterContract>
    ): Observable<PageResult<DepartmentEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    create(contract: DepartmentCreateContract): void {
        this.runAction(
            this.useCase.create(contract),
            'COMMON.SUCCESS.CREATE',
            () => this.reload()
        );
    }

    update(contract: DepartmentUpdateContract): void {
        this.runAction(
            this.useCase.update(contract),
            'COMMON.SUCCESS.UPDATE',
            () => this.reload()
        );
    }

    delete(contract: DepartmentDeleteContract): void {
        this.runAction(
            this.useCase.delete(contract),
            'COMMON.SUCCESS.DELETE',
            () => this.reload()
        );
    }
}
