import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
    InteractiveMapReportEntity,
    InteractiveMapRepository,
} from '@cmz/interactive-map-domain';
import { FetchOptions } from '@cmz/shared-domain';

@Service()
export class InteractiveMapReportsUseCase {
    private readonly repository = inject(InteractiveMapRepository);

    execute(options?: FetchOptions): Observable<InteractiveMapReportEntity[]> {
        return this.repository.getReports(options);
    }
}
