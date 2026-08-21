import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { ResourceFacade } from '@cmz/shared-application';
import { FetchOptions } from '@cmz/shared-domain';
import { InteractiveMapReportEntity } from '@cmz/interactive-map-domain';
import { InteractiveMapReportsUseCase } from '../use-cases/interactive-map-reports.use-case';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginFacade` (libs/authentication/application/src/lib/facades/login.facade.ts). */
@Service({ autoProvided: false })
export class InteractiveMapSigFacade extends ResourceFacade<
    InteractiveMapReportEntity[],
    FetchOptions
> {
    private readonly useCase = inject(InteractiveMapReportsUseCase);

    protected stream(
        params: FetchOptions
    ): Observable<InteractiveMapReportEntity[]> {
        return this.useCase.execute(params);
    }

    load(options?: FetchOptions): void {
        this.setParams(options ?? {});
    }
}
