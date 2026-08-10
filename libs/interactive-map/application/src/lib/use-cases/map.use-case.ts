import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { InteractiveMapRepository } from '@cmz/interactive-map-domain';

@Service()
export class MapUseCase {
    private readonly repository = inject(InteractiveMapRepository);

    execute(options?: FetchOptions): Observable<GrafanaLinkEntity> {
        return defer(() => this.repository.getMap(options));
    }
}
