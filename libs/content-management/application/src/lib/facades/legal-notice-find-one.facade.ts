import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    LegalNoticeFindOneEntity,
    LegalNoticeFindOneFilterContract,
} from '@cmz/content-management-domain';
import { LegalNoticeFindOneUseCase } from '../use-cases/legal-notice-find-one.use-case';
import { Observable } from 'rxjs';

interface LegalNoticeFindOneParams {
    filter: LegalNoticeFindOneFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class LegalNoticeFindOneFacade extends ResourceFacade<
    LegalNoticeFindOneEntity,
    LegalNoticeFindOneParams
> {
    private readonly useCase = inject(LegalNoticeFindOneUseCase);

    protected stream(
        params: LegalNoticeFindOneParams
    ): Observable<LegalNoticeFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: LegalNoticeFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
