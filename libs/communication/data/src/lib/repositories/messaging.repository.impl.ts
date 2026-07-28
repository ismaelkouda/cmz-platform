import { Service, inject } from '@angular/core';
import {
    MessagingCreateValidateContract,
    MessagingDeleteValidateContract,
    MessagingDisableValidateContract,
    MessagingEnableValidateContract,
    MessagingEntity,
    MessagingFilterContract,
    MessagingRepository,
    MessagingUpdateValidateContract,
} from '@cmz/communication-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { messagingDeleteMapper } from '../mappers/messaging-delete.mapper';
import { messagingDisableMapper } from '../mappers/messaging-disable.mapper';
import { messagingEnableMapper } from '../mappers/messaging-enable.mapper';
import { MessagingCreateMapper } from '../mappers/messaging-create.mapper';
import { MessagingUpdateMapper } from '../mappers/messaging-update.mapper';
import { MessagingFilterMapper } from '../mappers/messaging-filter.mapper';
import { MessagingMapper } from '../mappers/messaging.mapper';
import { MessagingApi } from '../sources/messaging.api';

@Service()
export class MessagingRepositoryImpl implements MessagingRepository {
    private readonly api = inject(MessagingApi);
    private readonly mapper = inject(MessagingMapper);
    private readonly messageMapper = inject(MessageResultMapper);
    private readonly filterMapper = inject(MessagingFilterMapper);
    private readonly createMapper = inject(MessagingCreateMapper);
    private readonly updateMapper = inject(MessagingUpdateMapper);

    execute(
        filter: MessagingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MessagingEntity>> {
        return this.api
            .readAll(this.filterMapper.mapContractToApi(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: MessagingCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(this.createMapper.mapContractToApi(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: MessagingUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(this.updateMapper.mapContractToApi(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: MessagingDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(messagingDeleteMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    enable(
        validContract: MessagingEnableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .enable(messagingEnableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    disable(
        validContract: MessagingDisableValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .disable(messagingDisableMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
