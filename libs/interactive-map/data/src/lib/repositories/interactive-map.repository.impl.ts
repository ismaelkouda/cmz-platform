import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { unwrapResponse } from '@cmz/shared-data';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InteractiveMapReportEntity,
    InteractiveMapRepository,
    MapEntity,
} from '@cmz/interactive-map-domain';
import { MapApi } from '../sources/map.api';
import { InteractiveMapReportsApi } from '../sources/interactive-map-reports.api';
import { InteractiveMapReportMapper } from '../mappers/interactive-map-report.mapper';
import { MapMapper } from '../mappers/map.mapper';
import {
    InteractiveMapReportApiDto,
    InteractiveMapReportsResponseApiDto,
} from '../dtos/interactive-map-report-api.dto';

@Service()
export class InteractiveMapRepositoryImpl implements InteractiveMapRepository {
    private readonly mapApi = inject(MapApi);
    private readonly reportsApi = inject(InteractiveMapReportsApi);
    private readonly mapMapper = new MapMapper();
    private readonly reportMapper = new InteractiveMapReportMapper();

    getMap(options?: FetchOptions): Observable<MapEntity> {
        return this.mapApi
            .getMap(options)
            .pipe(map((response) => this.mapMapper.mapFromDto(response)));
    }

    getReports(
        options?: FetchOptions
    ): Observable<InteractiveMapReportEntity[]> {
        return this.reportsApi.getReports(options).pipe(
            map((response) => {
                const payload = unwrapResponse(
                    response
                ) as InteractiveMapReportsResponseApiDto;
                return payload.data?.data ?? [];
            }),
            map((items) =>
                items
                    .filter((item) => !item.is_duplicated)
                    .map((item) => this.reportMapper.mapFromDto(item))
            )
        );
    }
}
