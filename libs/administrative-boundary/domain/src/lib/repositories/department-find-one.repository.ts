import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { DepartmentFindOneFilterValidateContract } from '../contracts/department-find-one-filter.validate-contract';
import { DepartmentFindOneEntity } from '../entities/department-find-one.entity';

export abstract class DepartmentFindOneRepository {
    abstract execute(
        filter: DepartmentFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<DepartmentFindOneEntity>;
}
