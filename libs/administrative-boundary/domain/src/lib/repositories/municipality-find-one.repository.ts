import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MunicipalityFindOneFilterValidateContract } from '../contracts/municipality-find-one-filter.validate-contract';
import { MunicipalityFindOneEntity } from '../entities/municipality-find-one.entity';

export abstract class MunicipalityFindOneRepository {
    abstract execute(
        filter: MunicipalityFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<MunicipalityFindOneEntity>;
}
