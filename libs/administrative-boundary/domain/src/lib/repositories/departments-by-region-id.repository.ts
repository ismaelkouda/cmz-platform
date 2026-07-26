import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { DepartmentsByRegionIdFilterValidateContract } from '../contracts/departments-by-region-id-filter.validate-contract';
import { DepartmentsByRegionIdEntity } from '../entities/departments-by-region-id.entity';

/** Port de la vue imbriquée « départements d'une région » — lecture seule. */
export abstract class DepartmentsByRegionIdRepository {
    abstract execute(
        filter: DepartmentsByRegionIdFilterValidateContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<DepartmentsByRegionIdEntity>>;
}
