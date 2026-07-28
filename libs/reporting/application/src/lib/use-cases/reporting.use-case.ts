import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    GrafanaDashboardEntity,
    ReportingRepository,
    ReportingSection,
} from '@cmz/reporting-domain';

@Injectable({ providedIn: 'root' })
export class ReportingUseCase {
    private readonly repository = inject(ReportingRepository);

    execute(
        section: ReportingSection,
        options?: FetchOptions
    ): Observable<GrafanaDashboardEntity> {
        return defer(() => this.repository.execute(section, options));
    }
}
