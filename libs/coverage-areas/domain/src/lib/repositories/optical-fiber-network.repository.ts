import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { OpticalFiberNetworkFilterContract } from '../contracts/optical-fiber-network-filter.contract';
import { OpticalFiberNetworkCreateValidateContract } from '../contracts/optical-fiber-network-create.validate-contract';
import { OpticalFiberNetworkUpdateValidateContract } from '../contracts/optical-fiber-network-update.validate-contract';
import { OpticalFiberNetworkDeleteValidateContract } from '../contracts/optical-fiber-network-delete.validate-contract';
import { OpticalFiberNetworkEnableValidateContract } from '../contracts/optical-fiber-network-enable.validate-contract';
import { OpticalFiberNetworkDisableValidateContract } from '../contracts/optical-fiber-network-disable.validate-contract';
import { OpticalFiberNetworkEntity } from '../entities/optical-fiber-network.entity';

export abstract class OpticalFiberNetworkRepository {
    abstract execute(
        filter: OpticalFiberNetworkFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<OpticalFiberNetworkEntity>>;
    abstract create(
        contract: OpticalFiberNetworkCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: OpticalFiberNetworkUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: OpticalFiberNetworkDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: OpticalFiberNetworkEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: OpticalFiberNetworkDisableValidateContract
    ): Observable<MessageEntity>;
}
