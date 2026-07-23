import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneFilterContract,
    InfrastructureTypeFindOneRepository,
    infrastructureTypeFindOneFilterVo,
} from '@cmz/administrative-infrastructure-domain';
import { Observable, defer } from 'rxjs';

@Service()
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
