import { Service, inject } from '@angular/core';
import {
    MunicipalityOption,
    MunicipalitySelectRepository,
} from '@cmz/administrative-boundary-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { MunicipalitySelectMapper } from '../mappers/municipality-select.mapper';
import { MunicipalitySelectApi } from '../sources/municipality-select.api';

@Service()
export class MunicipalitySelectRepositoryImpl implements MunicipalitySelectRepository {
    private readonly api = inject(MunicipalitySelectApi);
    private readonly mapper = inject(MunicipalitySelectMapper);

    readAll(options?: FetchOptions): Observable<MunicipalityOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
