import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { GrafanaDashboardEntity, MonitoringSection } from '@cmz/monitoring-domain';
import { MonitoringUseCase } from '../use-cases/monitoring.use-case';

@Service()
export class ResourcesFacade extends ResourceFacade<
    GrafanaDashboardEntity,
    FetchOptions
> {
    private readonly useCase = inject(MonitoringUseCase);

    protected stream(params: FetchOptions): Observable<GrafanaDashboardEntity> {
        return this.useCase.execute(MonitoringSection.RESOURCES, params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
