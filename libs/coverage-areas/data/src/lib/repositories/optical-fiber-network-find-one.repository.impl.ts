import { Service, inject } from '@angular/core';
import {
    OpticalFiberNetworkFindOneEntity,
    OpticalFiberNetworkFindOneFilterValidateContract,
    OpticalFiberNetworkFindOneRepository,
} from '@cmz/coverage-areas-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { opticalFiberNetworkFindOneFilterMapper } from '../mappers/optical-fiber-network-find-one-filter.mapper';
import { OpticalFiberNetworkFindOneMapper } from '../mappers/optical-fiber-network-find-one.mapper';
import { OpticalFiberNetworkFindOneApi } from '../sources/optical-fiber-network-find-one.api';

@Service()
export class OpticalFiberNetworkFindOneRepositoryImpl implements OpticalFiberNetworkFindOneRepository {
    private readonly api = inject(OpticalFiberNetworkFindOneApi);
    private readonly mapper = inject(OpticalFiberNetworkFindOneMapper);

    execute(
        validContract: OpticalFiberNetworkFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<OpticalFiberNetworkFindOneEntity> {
        const dto = opticalFiberNetworkFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
