import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AllRequestsFilterContract,
    AllRequestsRepository,
    AllRequestsEntity,
    allRequestsFilterEntity,
    allRequestsFilterVo,
} from '@cmz/requests-domain';

@Service()
export class AllRequestsUseCase {
    private readonly repository = inject(AllRequestsRepository);

    execute(
        contract: AllRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllRequestsEntity>> {
        return defer(() =>
            this.repository.execute(
                allRequestsFilterEntity(allRequestsFilterVo(contract)),
                page,
                options
            )
        );
    }

    export(
        contract: AllRequestsFilterContract,
        options?: FetchOptions
    ): Observable<AllRequestsEntity[]> {
        return defer(() =>
            this.repository.export(
                allRequestsFilterEntity(allRequestsFilterVo(contract)),
                options
            )
        );
    }
}
