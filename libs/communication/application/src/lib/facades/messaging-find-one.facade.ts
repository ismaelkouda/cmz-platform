import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MessagingFindOneEntity,
    MessagingFindOneFilterValidateContract,
} from '@cmz/communication-domain';
import { Observable } from 'rxjs';
import { MessagingFindOneUseCase } from '../use-cases/messaging-find-one.use-case';

interface MessagingFindOneParams {
    filter: Partial<MessagingFindOneFilterValidateContract>;
    options?: FetchOptions;
}

@Service()
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

    read(
        filter: Partial<MessagingFindOneFilterValidateContract>,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
