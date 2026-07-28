import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    UsersFindOneEntity,
    UsersFindOneFilterContract,
} from '@cmz/settings-security-domain';
import { UsersFindOneUseCase } from '../use-cases/users-find-one.use-case';
import { Observable } from 'rxjs';

interface UsersFindOneParams {
    filter: UsersFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class UsersFindOneFacade extends ResourceFacade<
    UsersFindOneEntity,
    UsersFindOneParams
> {
    private readonly useCase = inject(UsersFindOneUseCase);

    protected stream(
        params: UsersFindOneParams
    ): Observable<UsersFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: UsersFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
