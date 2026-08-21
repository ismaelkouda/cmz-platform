import { inject, Service } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { ReportingRepository, ReportingSection } from '@cmz/reporting-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class ReportingUseCase {
    private readonly repository = inject(ReportingRepository);

    execute(
        section: ReportingSection,
        options?: FetchOptions
    ): Observable<GrafanaLinkEntity> {
        return defer(() => this.repository.execute(section, options));
    }
}
