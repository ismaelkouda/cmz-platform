import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { InfrastructureFilterContract } from '../contracts/infrastructure-filter.contract';
import { InfrastructureCreateValidateContract } from '../contracts/infrastructure-create.validate-contract';
import { InfrastructureUpdateValidateContract } from '../contracts/infrastructure-update.validate-contract';
import { InfrastructureDeleteValidateContract } from '../contracts/infrastructure-delete.validate-contract';
import { InfrastructureEntity } from '../entities/infrastructure.entity';

export abstract class InfrastructureRepository {
    abstract execute(
        filter: InfrastructureFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<InfrastructureEntity>>;
    abstract create(
        contract: InfrastructureCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: InfrastructureUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: InfrastructureDeleteValidateContract
    ): Observable<MessageEntity>;
}
