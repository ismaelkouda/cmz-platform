import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MobileNetworkFindOneEntity,
    MobileNetworkFindOneFilterContract,
    MobileNetworkFindOneRepository,
    mobileNetworkFindOneFilterVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class MobileNetworkFindOneUseCase {
    private readonly repository = inject(MobileNetworkFindOneRepository);

    execute(
        contract: MobileNetworkFindOneFilterContract,
        options?: FetchOptions
    ): Observable<MobileNetworkFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                mobileNetworkFindOneFilterVo(contract),
                options
            )
        );
    }
}
