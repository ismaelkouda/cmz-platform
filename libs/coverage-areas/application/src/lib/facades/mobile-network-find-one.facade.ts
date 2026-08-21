import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MobileNetworkFindOneEntity,
    MobileNetworkFindOneFilterContract,
} from '@cmz/coverage-areas-domain';
import { MobileNetworkFindOneUseCase } from '../use-cases/mobile-network-find-one.use-case';
import { Observable } from 'rxjs';

interface MobileNetworkFindOneParams {
    filter: MobileNetworkFindOneFilterContract;
    options?: FetchOptions;
}

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class MobileNetworkFindOneFacade extends ResourceFacade<
    MobileNetworkFindOneEntity,
    MobileNetworkFindOneParams
> {
    private readonly useCase = inject(MobileNetworkFindOneUseCase);

    protected stream(
        params: MobileNetworkFindOneParams
    ): Observable<MobileNetworkFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: MobileNetworkFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
