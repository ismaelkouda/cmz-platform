import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { MapEntity } from '@cmz/interactive-map-domain';
import { MapUseCase } from '../use-cases/map.use-case';

@Injectable({ providedIn: 'root' })
export class MapFacade extends ResourceFacade<MapEntity, FetchOptions> {
    private readonly useCase = inject(MapUseCase);

    protected stream(params: FetchOptions): Observable<MapEntity> {
        return this.useCase.execute(params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
