import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    HomeFindOneEntity,
    HomeFindOneFilterContract,
    HomeFindOneRepository,
    homeFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class HomeFindOneUseCase {
    private readonly repository = inject(HomeFindOneRepository);

    execute(
        contract: HomeFindOneFilterContract,
        options?: FetchOptions
    ): Observable<HomeFindOneEntity> {
        return defer(() =>
            this.repository.execute(homeFindOneFilterVo(contract), options)
        );
    }
}
