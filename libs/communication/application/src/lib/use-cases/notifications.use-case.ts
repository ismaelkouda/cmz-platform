import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    NotificationsEntity,
    NotificationsFilterContract,
    NotificationsReadOneValidateContract,
    NotificationsRepository,
    notificationsFilterVo,
    notificationsReadOneVo,
} from '@cmz/communication-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class NotificationsUseCase {
    private readonly repository = inject(NotificationsRepository);

    execute(
        contract: NotificationsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<NotificationsEntity>> {
        return defer(() =>
            this.repository.execute(
                notificationsFilterVo(contract),
                page,
                options
            )
        );
    }

    readOne(
        contract: Partial<NotificationsReadOneValidateContract>
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.readOne(notificationsReadOneVo(contract))
        );
    }

    readAll(): Observable<MessageEntity> {
        return defer(() => this.repository.readAll());
    }
}
