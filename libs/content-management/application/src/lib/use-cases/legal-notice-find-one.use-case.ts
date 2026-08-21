import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    LegalNoticeFindOneEntity,
    LegalNoticeFindOneFilterContract,
    LegalNoticeFindOneRepository,
    legalNoticeFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class LegalNoticeFindOneUseCase {
    private readonly repository = inject(LegalNoticeFindOneRepository);

    execute(
        contract: LegalNoticeFindOneFilterContract,
        options?: FetchOptions
    ): Observable<LegalNoticeFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                legalNoticeFindOneFilterVo(contract),
                options
            )
        );
    }
}
