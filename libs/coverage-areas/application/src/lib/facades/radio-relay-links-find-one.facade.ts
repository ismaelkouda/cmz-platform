import { Service, inject } from '@angular/core';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    RadioRelayLinksFindOneEntity,
    RadioRelayLinksFindOneFilterContract,
} from '@cmz/coverage-areas-domain';
import { RadioRelayLinksFindOneUseCase } from '../use-cases/radio-relay-links-find-one.use-case';
import { Observable } from 'rxjs';

interface RadioRelayLinksFindOneParams {
    filter: RadioRelayLinksFindOneFilterContract;
    options?: FetchOptions;
}

@Service()
export class RadioRelayLinksFindOneFacade extends ResourceFacade<
    RadioRelayLinksFindOneEntity,
    RadioRelayLinksFindOneParams
> {
    private readonly useCase = inject(RadioRelayLinksFindOneUseCase);

    protected stream(
        params: RadioRelayLinksFindOneParams
    ): Observable<RadioRelayLinksFindOneEntity> {
        return this.useCase.execute(params.filter, params.options);
    }

    read(
        filter: RadioRelayLinksFindOneFilterContract,
        options?: FetchOptions
    ): void {
        this.setParams({ filter, options });
    }
}
