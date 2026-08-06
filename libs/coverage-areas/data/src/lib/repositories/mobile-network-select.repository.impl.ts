import { Service, inject } from '@angular/core';
import { MobileNetworkSelectRepository } from '@cmz/coverage-areas-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { MobileNetworkSelectMapper } from '../mappers/mobile-network-select.mapper';
import { MobileNetworkSelectApi } from '../sources/mobile-network-select.api';

@Service()
export class MobileNetworkSelectRepositoryImpl implements MobileNetworkSelectRepository {
    private readonly api = inject(MobileNetworkSelectApi);
    private readonly mapper = inject(MobileNetworkSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
