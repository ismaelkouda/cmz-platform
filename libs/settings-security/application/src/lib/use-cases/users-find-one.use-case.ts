import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    UsersFindOneEntity,
    UsersFindOneFilterContract,
    UsersFindOneRepository,
    usersFindOneFilterVo,
} from '@cmz/settings-security-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class UsersFindOneUseCase {
    private readonly repository = inject(UsersFindOneRepository);

    execute(
        contract: UsersFindOneFilterContract,
        options?: FetchOptions
    ): Observable<UsersFindOneEntity> {
        return defer(() =>
            this.repository.execute(usersFindOneFilterVo(contract), options)
        );
    }
}
