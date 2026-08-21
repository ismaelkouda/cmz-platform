import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
    InteractiveMapReportEntity,
    InteractiveMapRepository,
} from '@cmz/interactive-map-domain';
import { FetchOptions } from '@cmz/shared-domain';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class InteractiveMapReportsUseCase {
    private readonly repository = inject(InteractiveMapRepository);

    execute(options?: FetchOptions): Observable<InteractiveMapReportEntity[]> {
        return this.repository.getReports(options);
    }
}
