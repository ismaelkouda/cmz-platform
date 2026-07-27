import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MobileNetworkFindOneFilterValidateContract } from '../contracts/mobile-network-find-one-filter.validate-contract';
import { MobileNetworkFindOneEntity } from '../entities/mobile-network-find-one.entity';

export abstract class MobileNetworkFindOneRepository {
    abstract execute(
        filter: MobileNetworkFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<MobileNetworkFindOneEntity>;
}
