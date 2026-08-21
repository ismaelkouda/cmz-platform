import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MessagingFindOneEntity,
    MessagingFindOneFilterContract,
    MessagingFindOneRepository,
    messagingFindOneFilterVo,
} from '@cmz/communication-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class MessagingFindOneUseCase {
    private readonly repository = inject(MessagingFindOneRepository);

    execute(
        contract: MessagingFindOneFilterContract,
        options?: FetchOptions
    ): Observable<MessagingFindOneEntity> {
        return defer(() =>
            this.repository.execute(messagingFindOneFilterVo(contract), options)
        );
    }
}
