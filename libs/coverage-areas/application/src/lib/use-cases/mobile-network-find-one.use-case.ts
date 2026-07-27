import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MobileNetworkFindOneEntity,
    MobileNetworkFindOneFilterContract,
    MobileNetworkFindOneRepository,
    mobileNetworkFindOneFilterVo,
} from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
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
