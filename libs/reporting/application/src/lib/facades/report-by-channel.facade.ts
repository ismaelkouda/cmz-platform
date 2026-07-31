import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import {
    GrafanaDashboardEntity,
    ReportingSection,
} from '@cmz/reporting-domain';
import { ReportingUseCase } from '../use-cases/reporting.use-case';

@Service()
export class ReportByChannelFacade extends ResourceFacade<
    GrafanaDashboardEntity,
    FetchOptions
> {
    private readonly useCase = inject(ReportingUseCase);

    protected stream(params: FetchOptions): Observable<GrafanaDashboardEntity> {
        return this.useCase.execute(ReportingSection.REPORT_BY_CHANNEL, params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
