import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { InteractiveMapRepository } from '@cmz/interactive-map-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class MapUseCase {
    private readonly repository = inject(InteractiveMapRepository);

    execute(options?: FetchOptions): Observable<GrafanaLinkEntity> {
        return defer(() => this.repository.getMap(options));
    }
}
