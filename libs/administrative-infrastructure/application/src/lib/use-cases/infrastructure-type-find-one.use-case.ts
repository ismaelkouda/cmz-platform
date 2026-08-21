import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneFilterContract,
    InfrastructureTypeFindOneRepository,
    infrastructureTypeFindOneFilterVo,
} from '@cmz/administrative-infrastructure-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class InfrastructureTypeFindOneUseCase {
    private readonly repository = inject(InfrastructureTypeFindOneRepository);

    execute(
        contract: InfrastructureTypeFindOneFilterContract,
        options?: FetchOptions
    ): Observable<InfrastructureTypeFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                infrastructureTypeFindOneFilterVo(contract),
                options
            )
        );
    }
}
