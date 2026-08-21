import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TermsUseFindOneEntity,
    TermsUseFindOneFilterContract,
    TermsUseFindOneRepository,
    termsUseFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class TermsUseFindOneUseCase {
    private readonly repository = inject(TermsUseFindOneRepository);

    execute(
        contract: TermsUseFindOneFilterContract,
        options?: FetchOptions
    ): Observable<TermsUseFindOneEntity> {
        return defer(() =>
            this.repository.execute(termsUseFindOneFilterVo(contract), options)
        );
    }
}
