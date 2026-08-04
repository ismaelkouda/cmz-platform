import { Service, inject } from '@angular/core';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    MessagingCreateContract,
    MessagingDeleteContract,
    MessagingDisableValidateContract,
    MessagingEnableValidateContract,
    MessagingEntity,
    MessagingFilterContract,
    MessagingRepository,
    MessagingUpdateContract,
    messagingCreateVo,
    messagingDeleteVo,
    messagingDisableVo,
    messagingEnableVo,
    messagingFilterEntity,
    messagingFilterVo,
    messagingUpdateVo,
} from '@cmz/communication-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class MessagingUseCase {
    private readonly repository = inject(MessagingRepository);

    execute(
        contract: MessagingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<MessagingEntity>> {
        return defer(() =>
            this.repository.execute(
                messagingFilterEntity(messagingFilterVo(contract)),
                page,
                options
            )
        );
    }

    create(contract: MessagingCreateContract): Observable<MessageEntity> {
        return defer(() => this.repository.create(messagingCreateVo(contract)));
    }

    update(contract: MessagingUpdateContract): Observable<MessageEntity> {
        return defer(() => this.repository.update(messagingUpdateVo(contract)));
    }

    delete(contract: MessagingDeleteContract): Observable<MessageEntity> {
        return defer(() => this.repository.delete(messagingDeleteVo(contract)));
    }

    enable(
        contract: Partial<MessagingEnableValidateContract>
    ): Observable<MessageEntity> {
        return defer(() => this.repository.enable(messagingEnableVo(contract)));
    }

    disable(
        contract: Partial<MessagingDisableValidateContract>
    ): Observable<MessageEntity> {
        return defer(() =>
            this.repository.disable(messagingDisableVo(contract))
        );
    }
}
