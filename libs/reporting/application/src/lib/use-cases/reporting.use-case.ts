import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    GrafanaDashboardEntity,
    ReportingRepository,
    ReportingSection,
} from '@cmz/reporting-domain';

@Service()
export class ReportingUseCase {
    private readonly repository = inject(ReportingRepository);

    execute(
        section: ReportingSection,
        options?: FetchOptions
    ): Observable<GrafanaDashboardEntity> {
        return defer(() => this.repository.execute(section, options));
    }
}
