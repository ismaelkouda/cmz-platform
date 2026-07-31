import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    QueuesRequestsEntity,
    QueuesRequestsFilterContract,
    QueuesRequestsRepository,
    queuesRequestsFilterEntity,
    queuesRequestsFilterVo,
} from '@cmz/requests-domain';

@Service()
export class QueuesRequestsUseCase {
    private readonly repository = inject(QueuesRequestsRepository);

    execute(
        contract: QueuesRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesRequestsEntity>> {
        return defer(() =>
            this.repository.execute(
                queuesRequestsFilterEntity(queuesRequestsFilterVo(contract)),
                page,
                options
            )
        );
    }

    export(
        contract: QueuesRequestsFilterContract,
        options?: FetchOptions
    ): Observable<QueuesRequestsEntity[]> {
        return defer(() =>
            this.repository.export(
                queuesRequestsFilterEntity(queuesRequestsFilterVo(contract)),
                options
            )
        );
    }
}
