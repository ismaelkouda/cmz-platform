import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { ReportingSection } from '@cmz/reporting-domain';
import { ReportingUseCase } from '../use-cases/reporting.use-case';

@Service()
export class ReportFacade extends ResourceFacade<
    GrafanaLinkEntity,
    FetchOptions
> {
    private readonly useCase = inject(ReportingUseCase);

    protected stream(params: FetchOptions): Observable<GrafanaLinkEntity> {
        return this.useCase.execute(ReportingSection.REPORT, params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
