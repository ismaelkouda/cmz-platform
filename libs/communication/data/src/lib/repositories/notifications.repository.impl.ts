import { Service, inject } from '@angular/core';
import {
    NotificationsEntity,
    NotificationsFilterContract,
    NotificationsReadOneValidateContract,
    NotificationsRepository,
} from '@cmz/communication-domain';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { MessageResultMapper } from '@cmz/shared-data';
import { map, Observable } from 'rxjs';
import { notificationsFilterMapper } from '../mappers/notifications-filter.mapper';
import { notificationsReadOneMapper } from '../mappers/notifications-read-one.mapper';
import { NotificationsMapper } from '../mappers/notifications.mapper';
import { NotificationsApi } from '../sources/notifications.api';

@Service()
export class NotificationsRepositoryImpl implements NotificationsRepository {
    private readonly api = inject(NotificationsApi);
    private readonly mapper = inject(NotificationsMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        filter: NotificationsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<NotificationsEntity>> {
        return this.api
            .execute(notificationsFilterMapper(filter), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    readOne(
        validContract: NotificationsReadOneValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .readOne(notificationsReadOneMapper(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    readAll(): Observable<MessageEntity> {
        return this.api
            .readAll()
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
