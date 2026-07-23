import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { InfrastructureTypeFilterContract } from '../contracts/infrastructure-type-filter.contract';
import { InfrastructureTypeCreateValidateContract } from '../contracts/infrastructure-type-create.validate-contract';
import { InfrastructureTypeUpdateValidateContract } from '../contracts/infrastructure-type-update.validate-contract';
import { InfrastructureTypeDeleteValidateContract } from '../contracts/infrastructure-type-delete.validate-contract';
import { InfrastructureTypeEnableValidateContract } from '../contracts/infrastructure-type-enable.validate-contract';
import { InfrastructureTypeDisableValidateContract } from '../contracts/infrastructure-type-disable.validate-contract';
import { InfrastructureTypeEntity } from '../entities/infrastructure-type.entity';

export abstract class InfrastructureTypeRepository {
    abstract execute(
        filter: InfrastructureTypeFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<InfrastructureTypeEntity>>;
    abstract create(
        contract: InfrastructureTypeCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: InfrastructureTypeUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: InfrastructureTypeDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: InfrastructureTypeEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: InfrastructureTypeDisableValidateContract
    ): Observable<MessageEntity>;
}
