import { Service, inject } from '@angular/core';
import {
    RegionOption,
    RegionSelectRepository,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { RegionSelectMapper } from '../mappers/region-select.mapper';
import { RegionSelectApi } from '../sources/region-select.api';

@Service()
export class RegionSelectRepositoryImpl implements RegionSelectRepository {
    private readonly api = inject(RegionSelectApi);
    private readonly mapper = inject(RegionSelectMapper);

    readAll(options?: FetchOptions): Observable<RegionOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
