import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MessagingFindOneEntity,
    MessagingFindOneFilterContract,
} from '@cmz/communication-domain';
import { Observable } from 'rxjs';
import { MessagingFindOneUseCase } from '../use-cases/messaging-find-one.use-case';

interface MessagingFindOneParams {
    filter: MessagingFindOneFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class MessagingFindOneFacade extends ResourceFacade<
    MessagingFindOneEntity,
    MessagingFindOneParams
> {
    private readonly useCase = inject(MessagingFindOneUseCase);

    protected stream(
        params: MessagingFindOneParams
    ): Observable<MessagingFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: MessagingFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
