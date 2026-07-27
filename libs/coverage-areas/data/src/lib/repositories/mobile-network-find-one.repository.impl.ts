import { Service, inject } from '@angular/core';
import {
    MobileNetworkFindOneEntity,
    MobileNetworkFindOneFilterValidateContract,
    MobileNetworkFindOneRepository,
} from '@cmz/coverage-areas-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { mobileNetworkFindOneFilterMapper } from '../mappers/mobile-network-find-one-filter.mapper';
import { MobileNetworkFindOneMapper } from '../mappers/mobile-network-find-one.mapper';
import { MobileNetworkFindOneApi } from '../sources/mobile-network-find-one.api';

@Service()
export class MobileNetworkFindOneRepositoryImpl implements MobileNetworkFindOneRepository {
    private readonly api = inject(MobileNetworkFindOneApi);
    private readonly mapper = inject(MobileNetworkFindOneMapper);

    execute(
        validContract: MobileNetworkFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<MobileNetworkFindOneEntity> {
        const dto = mobileNetworkFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
