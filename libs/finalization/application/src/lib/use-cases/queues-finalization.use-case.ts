import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    QueuesFinalizationEntity,
    QueuesFinalizationFilterContract,
    QueuesFinalizationRepository,
    queuesFinalizationFilterEntity,
    queuesFinalizationFilterVo,
} from '@cmz/finalization-domain';

@Service()
export class QueuesFinalizationUseCase {
    private readonly repository = inject(QueuesFinalizationRepository);

    execute(
        contract: QueuesFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesFinalizationEntity>> {
        return defer(() =>
            this.repository.execute(
                queuesFinalizationFilterEntity(
                    queuesFinalizationFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    export(
        contract: QueuesFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<QueuesFinalizationEntity[]> {
        return defer(() =>
            this.repository.export(
                queuesFinalizationFilterEntity(
                    queuesFinalizationFilterVo(contract)
                ),
                options
            )
        );
    }
}
