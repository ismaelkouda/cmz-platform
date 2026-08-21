import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { ReportingSection } from '@cmz/reporting-domain';
import { ReportingUseCase } from '../use-cases/reporting.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (`libs/authentication/application/src/lib/facades/login.facade.ts`). */
@Service({ autoProvided: false })
export class ReportByChannelFacade extends ResourceFacade<
    GrafanaLinkEntity,
    FetchOptions
> {
    private readonly useCase = inject(ReportingUseCase);

    protected stream(params: FetchOptions): Observable<GrafanaLinkEntity> {
        return this.useCase.execute(ReportingSection.REPORT_BY_CHANNEL, params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
