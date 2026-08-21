import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { MonitoringSection } from '@cmz/monitoring-domain';
import { MonitoringUseCase } from '../use-cases/monitoring.use-case';

/**
 * Une façade par page (comme le source) plutôt qu'une façade générique
 * partagée : chaque page reste un singleton `providedIn: 'root'` distinct,
 * donc pas d'état partagé entre sections en cas de navigation croisée. Seule
 * la section lue (`MonitoringSection.NODE`) diffère de `ServicesFacade` /
 * `ResourcesFacade` / `JobsFacade` — domaine/data, eux, sont consolidés.
 */
/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (`libs/authentication/application/src/lib/facades/login.facade.ts`). */
@Service({ autoProvided: false })
export class NodeFacade extends ResourceFacade<
    GrafanaLinkEntity,
    FetchOptions
> {
    private readonly useCase = inject(MonitoringUseCase);

    protected stream(params: FetchOptions): Observable<GrafanaLinkEntity> {
        return this.useCase.execute(MonitoringSection.NODE, params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
