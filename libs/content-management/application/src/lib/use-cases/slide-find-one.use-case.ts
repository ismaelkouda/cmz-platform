import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    SlideFindOneEntity,
    SlideFindOneFilterContract,
    SlideFindOneRepository,
    slideFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class SlideFindOneUseCase {
    private readonly repository = inject(SlideFindOneRepository);

    execute(
        contract: SlideFindOneFilterContract,
        options?: FetchOptions
    ): Observable<SlideFindOneEntity> {
        return defer(() =>
            this.repository.execute(slideFindOneFilterVo(contract), options)
        );
    }
}
