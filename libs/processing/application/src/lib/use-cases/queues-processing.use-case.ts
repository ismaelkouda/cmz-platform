import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    QueuesProcessingEntity,
    QueuesProcessingFilterContract,
    QueuesProcessingRepository,
    queuesProcessingFilterEntity,
    queuesProcessingFilterVo,
} from '@cmz/processing-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class QueuesProcessingUseCase {
    private readonly repository = inject(QueuesProcessingRepository);

    execute(
        contract: QueuesProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesProcessingEntity>> {
        return defer(() =>
            this.repository.execute(
                queuesProcessingFilterEntity(
                    queuesProcessingFilterVo(contract)
                ),
                page,
                options
            )
        );
    }

    export(
        contract: QueuesProcessingFilterContract,
        options?: FetchOptions
    ): Observable<QueuesProcessingEntity[]> {
        return defer(() =>
            this.repository.export(
                queuesProcessingFilterEntity(
                    queuesProcessingFilterVo(contract)
                ),
                options
            )
        );
    }
}
