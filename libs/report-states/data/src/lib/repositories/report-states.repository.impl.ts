import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    ReportStateItemEntity,
    ReportStatesRepository,
    ReportStateSection,
} from '@cmz/report-states-domain';
import { ReportStatesApi } from '../sources/report-states.api';
import { ReportStateItemMapper } from '../mappers/report-state-item.mapper';

@Injectable({ providedIn: 'root' })
export class ReportStatesRepositoryImpl implements ReportStatesRepository {
    private readonly api = inject(ReportStatesApi);
    private readonly mapper = new ReportStateItemMapper();

    execute(
        section: ReportStateSection,
        page = '1',
        options?: FetchOptions
    ): Observable<PageResult<ReportStateItemEntity>> {
        return this.api
            .execute(section, page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
