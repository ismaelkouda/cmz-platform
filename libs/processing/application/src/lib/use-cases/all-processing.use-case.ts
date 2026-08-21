import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AllProcessingFilterContract,
    AllProcessingRepository,
    AllProcessingEntity,
    allProcessingFilterEntity,
    allProcessingFilterVo,
} from '@cmz/processing-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class AllProcessingUseCase {
    private readonly repository = inject(AllProcessingRepository);

    execute(
        contract: AllProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllProcessingEntity>> {
        return defer(() =>
            this.repository.execute(
                allProcessingFilterEntity(allProcessingFilterVo(contract)),
                page,
                options
            )
        );
    }

    export(
        contract: AllProcessingFilterContract,
        options?: FetchOptions
    ): Observable<AllProcessingEntity[]> {
        return defer(() =>
            this.repository.export(
                allProcessingFilterEntity(allProcessingFilterVo(contract)),
                options
            )
        );
    }
}
