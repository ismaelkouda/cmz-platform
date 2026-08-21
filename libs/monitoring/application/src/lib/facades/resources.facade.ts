import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { MonitoringSection } from '@cmz/monitoring-domain';
import { MonitoringUseCase } from '../use-cases/monitoring.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (`libs/authentication/application/src/lib/facades/login.facade.ts`). */
@Service({ autoProvided: false })
export class ResourcesFacade extends ResourceFacade<
    GrafanaLinkEntity,
    FetchOptions
> {
    private readonly useCase = inject(MonitoringUseCase);

    protected stream(params: FetchOptions): Observable<GrafanaLinkEntity> {
        return this.useCase.execute(MonitoringSection.RESOURCES, params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
