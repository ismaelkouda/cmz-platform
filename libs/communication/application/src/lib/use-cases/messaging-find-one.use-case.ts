import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MessagingFindOneEntity,
    MessagingFindOneFilterValidateContract,
    MessagingFindOneRepository,
    messagingFindOneFilterVo,
} from '@cmz/communication-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class MessagingFindOneUseCase {
    private readonly repository = inject(MessagingFindOneRepository);

    execute(
        contract: Partial<MessagingFindOneFilterValidateContract>,
        options?: FetchOptions
    ): Observable<MessagingFindOneEntity> {
        return defer(() =>
            this.repository.execute(messagingFindOneFilterVo(contract), options)
        );
    }
}
