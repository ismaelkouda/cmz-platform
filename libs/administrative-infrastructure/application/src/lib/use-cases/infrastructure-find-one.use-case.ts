import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureFindOneEntity,
    InfrastructureFindOneFilterContract,
    InfrastructureFindOneRepository,
    infrastructureFindOneFilterVo,
} from '@cmz/administrative-infrastructure-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class InfrastructureFindOneUseCase {
    private readonly repository = inject(InfrastructureFindOneRepository);

    execute(
        contract: InfrastructureFindOneFilterContract,
        options?: FetchOptions
    ): Observable<InfrastructureFindOneEntity> {
        return defer(() =>
            this.repository.execute(
                infrastructureFindOneFilterVo(contract),
                options
            )
        );
    }
}
