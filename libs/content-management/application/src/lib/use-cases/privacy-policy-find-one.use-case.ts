import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    PrivacyPolicyFindOneEntity,
    PrivacyPolicyFindOneFilterContract,
    PrivacyPolicyFindOneRepository,
    privacyPolicyFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class PrivacyPolicyFindOneUseCase {
    private readonly repository = inject(PrivacyPolicyFindOneRepository);

    execute(
        contract: PrivacyPolicyFindOneFilterContract,
        options?: FetchOptions
    ): Observable<PrivacyPolicyFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                privacyPolicyFindOneFilterVo(contract),
                options
            )
        );
    }
}
