import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    SlideFindOneEntity,
    SlideFindOneFilterContract,
    SlideFindOneRepository,
    slideFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class SlideFindOneUseCase {
    private readonly repository = inject(SlideFindOneRepository);

    execute(
        contract: SlideFindOneFilterContract,
        options?: FetchOptions
    ): Observable<SlideFindOneEntity> {
        return defer(() =>
            this.repository.execute(slideFindOneFilterVo(contract), options)
        );
    }
}
