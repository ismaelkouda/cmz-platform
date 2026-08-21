import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { PageResult } from '@cmz/shared-domain';
import {
    QueuesFinalizationEntity,
    QueuesFinalizationFilterContract,
} from '@cmz/finalization-domain';
import { QueuesFinalizationUseCase } from '../use-cases/queues-finalization.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class QueuesFinalizationFacade extends PaginatedResourceFacade<
    QueuesFinalizationEntity,
    QueuesFinalizationFilterContract
> {
    private readonly useCase = inject(QueuesFinalizationUseCase);

    protected stream(
        params: PageQuery<QueuesFinalizationFilterContract>
    ): Observable<PageResult<QueuesFinalizationEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    /** Export métier — dataset complet filtré (hors pagination UI). */
    export(
        filter: QueuesFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<QueuesFinalizationEntity[]> {
        return this.useCase.export(filter, options);
    }
}
