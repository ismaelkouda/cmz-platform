import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { OpticalFiberNetworkFindOneFilterValidateContract } from '../contracts/optical-fiber-network-find-one-filter.validate-contract';
import { OpticalFiberNetworkFindOneEntity } from '../entities/optical-fiber-network-find-one.entity';

export abstract class OpticalFiberNetworkFindOneRepository {
    abstract execute(
        filter: OpticalFiberNetworkFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<OpticalFiberNetworkFindOneEntity>;
}
