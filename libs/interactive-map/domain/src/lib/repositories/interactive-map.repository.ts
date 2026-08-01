import { Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import { InteractiveMapReportEntity } from '../entities/interactive-map-report.entity';
import { MapEntity } from '../entities/map.entity';

export abstract class InteractiveMapRepository {
    abstract getMap(options?: FetchOptions): Observable<MapEntity>;
    abstract getReports(
        options?: FetchOptions
    ): Observable<InteractiveMapReportEntity[]>;
}
