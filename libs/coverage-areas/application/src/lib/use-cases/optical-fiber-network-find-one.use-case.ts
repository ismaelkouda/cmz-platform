import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    OpticalFiberNetworkFindOneEntity,
    OpticalFiberNetworkFindOneFilterContract,
    OpticalFiberNetworkFindOneRepository,
    opticalFiberNetworkFindOneFilterVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
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
