import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    PrivacyPolicyFindOneEntity,
    PrivacyPolicyFindOneFilterContract,
} from '@cmz/content-management-domain';
import { PrivacyPolicyFindOneUseCase } from '../use-cases/privacy-policy-find-one.use-case';
import { Observable } from 'rxjs';

interface PrivacyPolicyFindOneParams {
    filter: PrivacyPolicyFindOneFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class PrivacyPolicyFindOneFacade extends ResourceFacade<
    PrivacyPolicyFindOneEntity,
    PrivacyPolicyFindOneParams
> {
    private readonly useCase = inject(PrivacyPolicyFindOneUseCase);

    protected stream(
        params: PrivacyPolicyFindOneParams
    ): Observable<PrivacyPolicyFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: PrivacyPolicyFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
