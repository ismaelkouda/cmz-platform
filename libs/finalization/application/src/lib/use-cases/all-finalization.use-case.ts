import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AllFinalizationFilterContract,
    AllFinalizationRepository,
    AllFinalizationEntity,
    allFinalizationFilterEntity,
    allFinalizationFilterVo,
} from '@cmz/finalization-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class AllFinalizationUseCase {
    private readonly repository = inject(AllFinalizationRepository);

    execute(
        contract: AllFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllFinalizationEntity>> {
        return defer(() =>
            this.repository.execute(
                allFinalizationFilterEntity(allFinalizationFilterVo(contract)),
                page,
                options
            )
        );
    }

    export(
        contract: AllFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<AllFinalizationEntity[]> {
        return defer(() =>
            this.repository.export(
                allFinalizationFilterEntity(allFinalizationFilterVo(contract)),
                options
            )
        );
    }
}
