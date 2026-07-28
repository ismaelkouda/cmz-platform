import { inject, Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    ReportStateItemEntity,
    ReportStatesRepository,
    ReportStateSection,
} from '@cmz/report-states-domain';

@Injectable({ providedIn: 'root' })
export class ReportStatesUseCase {
    private readonly repository = inject(ReportStatesRepository);

    execute(
        section: ReportStateSection,
        page = '1',
        options?: FetchOptions
    ): Observable<PageResult<ReportStateItemEntity>> {
        return defer(() => this.repository.execute(section, page, options));
    }
}
