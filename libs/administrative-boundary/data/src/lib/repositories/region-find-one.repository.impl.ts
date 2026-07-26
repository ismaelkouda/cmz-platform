import { Service, inject } from '@angular/core';
import {
    RegionFindOneEntity,
    RegionFindOneFilterValidateContract,
    RegionFindOneRepository,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { regionFindOneFilterMapper } from '../mappers/region-find-one-filter.mapper';
import { RegionFindOneMapper } from '../mappers/region-find-one.mapper';
import { RegionFindOneApi } from '../sources/region-find-one.api';

@Service()
export class RegionFindOneRepositoryImpl implements RegionFindOneRepository {
    private readonly api = inject(RegionFindOneApi);
    private readonly mapper = inject(RegionFindOneMapper);

    execute(
        filter: RegionFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<RegionFindOneEntity> {
        const dto = regionFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
