import { Service, inject } from '@angular/core';
import {
    MunicipalityFindOneEntity,
    MunicipalityFindOneFilterValidateContract,
    MunicipalityFindOneRepository,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { municipalityFindOneFilterMapper } from '../mappers/municipality-find-one-filter.mapper';
import { MunicipalityFindOneMapper } from '../mappers/municipality-find-one.mapper';
import { MunicipalityFindOneApi } from '../sources/municipality-find-one.api';

@Service()
export class MunicipalityFindOneRepositoryImpl implements MunicipalityFindOneRepository {
    private readonly api = inject(MunicipalityFindOneApi);
    private readonly mapper = inject(MunicipalityFindOneMapper);

    execute(
        filter: MunicipalityFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<MunicipalityFindOneEntity> {
        const dto = municipalityFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
