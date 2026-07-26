import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MunicipalitiesByDepartmentIdFilterValidateContract } from '../contracts/municipalities-by-department-id-filter.validate-contract';
import { MunicipalitiesByDepartmentIdEntity } from '../entities/municipalities-by-department-id.entity';

/** Port de la vue imbriquée « communes d'un département » — lecture seule. */
export abstract class MunicipalitiesByDepartmentIdRepository {
    abstract execute(
        filter: MunicipalitiesByDepartmentIdFilterValidateContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MunicipalitiesByDepartmentIdEntity>>;
}
