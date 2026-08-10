import { Observable } from 'rxjs';
import { FetchOptions, GrafanaLinkEntity } from '@cmz/shared-domain';
import { InteractiveMapReportEntity } from '../entities/interactive-map-report.entity';

export abstract class InteractiveMapRepository {
    abstract getMap(options?: FetchOptions): Observable<GrafanaLinkEntity>;
    abstract getReports(
        options?: FetchOptions
    ): Observable<InteractiveMapReportEntity[]>;
}
