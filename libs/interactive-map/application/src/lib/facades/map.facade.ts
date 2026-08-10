import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { MapUseCase } from '../use-cases/map.use-case';

@Service()
export class MapFacade extends ResourceFacade<GrafanaLinkEntity, FetchOptions> {
    private readonly useCase = inject(MapUseCase);

    protected stream(params: FetchOptions): Observable<GrafanaLinkEntity> {
        return this.useCase.execute(params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
