import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions } from '@cmz/shared-domain';
import {
    InteractiveMapRepository,
    MapEntity,
} from '@cmz/interactive-map-domain';
import { MapApi } from '../sources/map.api';
import { MapMapper } from '../mappers/map.mapper';

@Injectable({ providedIn: 'root' })
export class InteractiveMapRepositoryImpl implements InteractiveMapRepository {
    private readonly api = inject(MapApi);
    private readonly mapper = new MapMapper();

    getMap(options?: FetchOptions): Observable<MapEntity> {
        return this.api
            .getMap(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
