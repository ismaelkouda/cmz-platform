import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    HomeFindOneEntity,
    HomeFindOneFilterContract,
    HomeFindOneRepository,
    homeFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class HomeFindOneUseCase {
    private readonly repository = inject(HomeFindOneRepository);

    execute(
        contract: HomeFindOneFilterContract,
        options?: FetchOptions
    ): Observable<HomeFindOneEntity> {
        return defer(() =>
            this.repository.execute(homeFindOneFilterVo(contract), options)
        );
    }
}
