import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { ReportingRepository, ReportingSection } from '@cmz/reporting-domain';

@Service()
export class ReportingUseCase {
    private readonly repository = inject(ReportingRepository);

    execute(
        section: ReportingSection,
        options?: FetchOptions
    ): Observable<GrafanaLinkEntity> {
        return defer(() => this.repository.execute(section, options));
    }
}
