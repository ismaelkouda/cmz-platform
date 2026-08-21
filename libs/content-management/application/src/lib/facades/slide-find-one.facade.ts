import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    SlideFindOneEntity,
    SlideFindOneFilterContract,
} from '@cmz/content-management-domain';
import { SlideFindOneUseCase } from '../use-cases/slide-find-one.use-case';
import { Observable } from 'rxjs';

interface SlideFindOneParams {
    filter: SlideFindOneFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class SlideFindOneFacade extends ResourceFacade<
    SlideFindOneEntity,
    SlideFindOneParams
> {
    private readonly useCase = inject(SlideFindOneUseCase);

    protected stream(
        params: SlideFindOneParams
    ): Observable<SlideFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(filter: SlideFindOneFilterContract, options?: FetchOptions): void {
        this.setParams({ filter, options });
    }
}
