import { Service, inject } from '@angular/core';
import {
    DepartmentCreateValidateContract,
    DepartmentDeleteValidateContract,
    DepartmentEntity,
    DepartmentFilterContract,
    DepartmentRepository,
    DepartmentUpdateValidateContract,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { departmentCreateMapper } from '../mappers/department-create.mapper';
import { departmentDeleteMapper } from '../mappers/department-delete.mapper';
import { departmentFilterMapper } from '../mappers/department-filter.mapper';
import { departmentUpdateMapper } from '../mappers/department-update.mapper';
import { DepartmentMapper } from '../mappers/department.mapper';
import { DepartmentApi } from '../sources/department.api';

@Service()
export class DepartmentRepositoryImpl implements DepartmentRepository {
    private readonly api = inject(DepartmentApi);
    private readonly mapper = inject(DepartmentMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: DepartmentFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DepartmentEntity>> {
        return this.api
            .readAll(departmentFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: DepartmentCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(departmentCreateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: DepartmentUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(departmentUpdateMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: DepartmentDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(departmentDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
