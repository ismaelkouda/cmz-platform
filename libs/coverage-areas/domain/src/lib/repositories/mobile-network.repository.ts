import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MobileNetworkFilterContract } from '../contracts/mobile-network-filter.contract';
import { MobileNetworkCreateValidateContract } from '../contracts/mobile-network-create.validate-contract';
import { MobileNetworkUpdateValidateContract } from '../contracts/mobile-network-update.validate-contract';
import { MobileNetworkDeleteValidateContract } from '../contracts/mobile-network-delete.validate-contract';
import { MobileNetworkEnableValidateContract } from '../contracts/mobile-network-enable.validate-contract';
import { MobileNetworkDisableValidateContract } from '../contracts/mobile-network-disable.validate-contract';
import { MobileNetworkEntity } from '../entities/mobile-network.entity';

export abstract class MobileNetworkRepository {
    abstract execute(
        filter: MobileNetworkFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MobileNetworkEntity>>;
    abstract create(
        contract: MobileNetworkCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: MobileNetworkUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: MobileNetworkDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: MobileNetworkEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: MobileNetworkDisableValidateContract
    ): Observable<MessageEntity>;
}
