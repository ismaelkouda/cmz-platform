import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    OpticalFiberNetworkFindOneEntity,
    OpticalFiberNetworkFindOneFilterContract,
    OpticalFiberNetworkFindOneRepository,
    opticalFiberNetworkFindOneFilterVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class OpticalFiberNetworkFindOneUseCase {
    private readonly repository = inject(OpticalFiberNetworkFindOneRepository);

    execute(
        contract: OpticalFiberNetworkFindOneFilterContract,
        options?: FetchOptions
    ): Observable<OpticalFiberNetworkFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                opticalFiberNetworkFindOneFilterVo(contract),
                options
            )
        );
    }
}
