import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { PageQuery, PaginatedResourceFacade } from '@cmz/shared-application';
import {
    AllProcessingFilterContract,
    AllProcessingEntity,
} from '@cmz/processing-domain';
import { AllProcessingUseCase } from '../use-cases/all-processing.use-case';

@Service()
export class AllProcessingFacade extends PaginatedResourceFacade<
    AllProcessingEntity,
    AllProcessingFilterContract
> {
    private readonly useCase = inject(AllProcessingUseCase);

    protected stream(
        params: PageQuery<AllProcessingFilterContract>
    ): Observable<PageResult<AllProcessingEntity>> {
        return this.useCase.execute(
            params.filter ?? {},
            params.page,
            params.options
        );
    }

    export(
        filter: AllProcessingFilterContract,
        options?: FetchOptions
    ): Observable<AllProcessingEntity[]> {
        return this.useCase.export(filter, options);
    }
}
