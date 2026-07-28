import { Service, inject } from '@angular/core';
import {
    SlideFindOneEntity,
    SlideFindOneFilterValidateContract,
    SlideFindOneRepository,
} from '@cmz/content-management-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { slideFindOneFilterMapper } from '../mappers/slide-find-one-filter.mapper';
import { SlideFindOneMapper } from '../mappers/slide-find-one.mapper';
import { SlideFindOneApi } from '../sources/slide-find-one.api';

@Service()
export class SlideFindOneRepositoryImpl implements SlideFindOneRepository {
    private readonly api = inject(SlideFindOneApi);
    private readonly mapper = inject(SlideFindOneMapper);

    execute(
        filter: SlideFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<SlideFindOneEntity> {
        const dto = slideFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
