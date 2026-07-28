import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TermsUseFindOneEntity,
    TermsUseFindOneFilterContract,
} from '@cmz/content-management-domain';
import { TermsUseFindOneUseCase } from '../use-cases/terms-use-find-one.use-case';
import { Observable } from 'rxjs';

interface TermsUseFindOneParams {
    filter: TermsUseFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class TermsUseFindOneFacade extends ResourceFacade<
    TermsUseFindOneEntity,
    TermsUseFindOneParams
> {
    private readonly useCase = inject(TermsUseFindOneUseCase);

    protected stream(
        params: TermsUseFindOneParams
    ): Observable<TermsUseFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: TermsUseFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
