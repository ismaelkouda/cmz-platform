import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    NewsFindOneEntity,
    NewsFindOneFilterContract,
    NewsFindOneRepository,
    newsFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class NewsFindOneUseCase {
    private readonly repository = inject(NewsFindOneRepository);

    execute(
        contract: NewsFindOneFilterContract,
        options?: FetchOptions
    ): Observable<NewsFindOneEntity> {
        return defer(() =>
            this.repository.execute(newsFindOneFilterVo(contract), options)
        );
    }
}
