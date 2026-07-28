import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { UsersEntity } from '../entities/users.entity';
import { UsersCreateValidateContract } from '../contracts/users-create.validate-contract';
import { UsersUpdateValidateContract } from '../contracts/users-update.validate-contract';
import { UsersDeleteValidateContract } from '../contracts/users-delete.validate-contract';
import { UsersEnableValidateContract } from '../contracts/users-enable.validate-contract';
import { UsersDisableValidateContract } from '../contracts/users-disable.validate-contract';
import { UsersFilterContract } from '../contracts/users-filter.contract';

export abstract class UsersRepository {
    abstract execute(
        filter: UsersFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<UsersEntity>>;
    abstract create(
        contract: UsersCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: UsersUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: UsersDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        contract: UsersEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        contract: UsersDisableValidateContract
    ): Observable<MessageEntity>;
}
