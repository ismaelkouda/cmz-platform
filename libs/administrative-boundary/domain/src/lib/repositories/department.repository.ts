import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { DepartmentFilterContract } from '../contracts/department-filter.contract';
import { DepartmentCreateValidateContract } from '../contracts/department-create.validate-contract';
import { DepartmentUpdateValidateContract } from '../contracts/department-update.validate-contract';
import { DepartmentDeleteValidateContract } from '../contracts/department-delete.validate-contract';
import { DepartmentEntity } from '../entities/department.entity';

/** Port `department` — CRUD seul, pas de toggle (aucun enable/disable source). */
export abstract class DepartmentRepository {
    abstract execute(
        filter: DepartmentFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DepartmentEntity>>;
    abstract create(
        contract: DepartmentCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: DepartmentUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: DepartmentDeleteValidateContract
    ): Observable<MessageEntity>;
}
