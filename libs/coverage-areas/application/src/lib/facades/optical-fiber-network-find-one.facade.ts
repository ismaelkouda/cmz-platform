import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    OpticalFiberNetworkFindOneEntity,
    OpticalFiberNetworkFindOneFilterContract,
} from '@cmz/coverage-areas-domain';
import { OpticalFiberNetworkFindOneUseCase } from '../use-cases/optical-fiber-network-find-one.use-case';
import { Observable } from 'rxjs';

interface OpticalFiberNetworkFindOneParams {
    filter: OpticalFiberNetworkFindOneFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class OpticalFiberNetworkFindOneFacade extends ResourceFacade<
    OpticalFiberNetworkFindOneEntity,
    OpticalFiberNetworkFindOneParams
> {
    private readonly useCase = inject(OpticalFiberNetworkFindOneUseCase);

    protected stream(
        params: OpticalFiberNetworkFindOneParams
    ): Observable<OpticalFiberNetworkFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: OpticalFiberNetworkFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
