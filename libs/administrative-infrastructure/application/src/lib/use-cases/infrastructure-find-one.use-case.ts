import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureFindOneEntity,
    InfrastructureFindOneFilterContract,
    InfrastructureFindOneRepository,
    infrastructureFindOneFilterVo,
} from '@cmz/administrative-infrastructure-domain';
import { Observable, defer } from 'rxjs';

@Service()
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
