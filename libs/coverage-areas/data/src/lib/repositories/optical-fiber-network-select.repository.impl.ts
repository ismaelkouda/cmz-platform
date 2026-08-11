import { Service, inject } from '@angular/core';
import { OpticalFiberNetworkSelectRepository } from '@cmz/coverage-areas-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { OpticalFiberNetworkSelectMapper } from '../mappers/optical-fiber-network-select.mapper';
import { OpticalFiberNetworkSelectApi } from '../sources/optical-fiber-network-select.api';

@Service()
export class OpticalFiberNetworkSelectRepositoryImpl implements OpticalFiberNetworkSelectRepository {
    private readonly api = inject(OpticalFiberNetworkSelectApi);
    private readonly mapper = inject(OpticalFiberNetworkSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
