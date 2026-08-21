import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    SiteGroupFindOneEntity,
    SiteGroupFindOneFilterContract,
    SiteGroupFindOneRepository,
    siteGroupFindOneFilterVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class SiteGroupFindOneUseCase {
    private readonly repository = inject(SiteGroupFindOneRepository);

    execute(
        contract: SiteGroupFindOneFilterContract,
        options?: FetchOptions
    ): Observable<SiteGroupFindOneEntity> {
        return defer(() =>
            this.repository.execute(siteGroupFindOneFilterVo(contract), options)
        );
    }
}
