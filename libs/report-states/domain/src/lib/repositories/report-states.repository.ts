import { Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import { ReportStateSection } from '../enums/report-state-section.enum';
import { ReportStateItemEntity } from '../entities/report-state-item.entity';

export abstract class ReportStatesRepository {
    abstract execute(
        section: ReportStateSection,
        page?: string,
        options?: FetchOptions
    ): Observable<PageResult<ReportStateItemEntity>>;
}
