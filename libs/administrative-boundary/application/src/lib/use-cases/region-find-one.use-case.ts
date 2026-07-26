import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    RegionFindOneEntity,
    RegionFindOneFilterContract,
    RegionFindOneRepository,
    regionFindOneFilterVo,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class RegionFindOneUseCase {
    private readonly repository = inject(RegionFindOneRepository);

    execute(
        contract: RegionFindOneFilterContract,
        options?: FetchOptions
    ): Observable<RegionFindOneEntity> {
        return defer(() =>
            this.repository.execute(regionFindOneFilterVo(contract), options)
        );
    }
}
