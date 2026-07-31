import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InteractiveMapRepository,
    MapEntity,
} from '@cmz/interactive-map-domain';

@Service()
export class MapUseCase {
    private readonly repository = inject(InteractiveMapRepository);

    execute(options?: FetchOptions): Observable<MapEntity> {
        return defer(() => this.repository.getMap(options));
    }
}
