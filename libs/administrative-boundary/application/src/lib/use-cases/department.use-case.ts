import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    DepartmentCreateContract,
    DepartmentDeleteContract,
    DepartmentEntity,
    DepartmentFilterContract,
    DepartmentRepository,
    DepartmentUpdateContract,
    departmentCreateVo,
    departmentDeleteVo,
    departmentFilterEntity,
    departmentFilterVo,
    departmentUpdateVo,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class DepartmentUseCase {
    private readonly repository = inject(DepartmentRepository);

    execute(
        contract: DepartmentFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DepartmentEntity>> {
        return defer(() =>
            this.repository.execute(
                departmentFilterEntity(departmentFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: DepartmentCreateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.create(departmentCreateVo(contract))
        );
    }

    update(contract: DepartmentUpdateContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.update(departmentUpdateVo(contract))
        );
    }

    delete(contract: DepartmentDeleteContract): Observable<MessageEntity> {
        return defer(() =>
            this.repository.delete(departmentDeleteVo(contract))
        );
    }
}
