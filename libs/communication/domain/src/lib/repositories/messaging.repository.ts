import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { MessagingCreateValidateContract } from '../contracts/messaging-create.validate-contract';
import { MessagingDeleteValidateContract } from '../contracts/messaging-delete.validate-contract';
import { MessagingDisableValidateContract } from '../contracts/messaging-disable.validate-contract';
import { MessagingEnableValidateContract } from '../contracts/messaging-enable.validate-contract';
import { MessagingFilterContract } from '../contracts/messaging-filter.contract';
import { MessagingUpdateValidateContract } from '../contracts/messaging-update.validate-contract';
import { MessagingEntity } from '../entities/messaging.entity';

export abstract class MessagingRepository {
    abstract execute(
        filter: MessagingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MessagingEntity>>;
    abstract create(
        validContract: MessagingCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        validContract: MessagingUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        validContract: MessagingDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract enable(
        validContract: MessagingEnableValidateContract
    ): Observable<MessageEntity>;
    abstract disable(
        validContract: MessagingDisableValidateContract
    ): Observable<MessageEntity>;
}
