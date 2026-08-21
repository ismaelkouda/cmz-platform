import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AllFinalizationFilterContract,
    AllFinalizationEntity,
} from '@cmz/finalization-domain';
import { AllFinalizationUseCase } from '../use-cases/all-finalization.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class AllFinalizationFacade extends PaginatedResourceFacade<
    AllFinalizationEntity,
    AllFinalizationFilterContract
> {
    private readonly useCase = inject(AllFinalizationUseCase);

    protected stream(
        params: PageQuery<AllFinalizationFilterContract>
    ): Observable<PageResult<AllFinalizationEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: AllFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<AllFinalizationEntity[]> {
        return this.useCase.export(filter, options);
    }
}
