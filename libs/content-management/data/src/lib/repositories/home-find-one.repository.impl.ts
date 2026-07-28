import { Service, inject } from '@angular/core';
import {
    HomeFindOneEntity,
    HomeFindOneFilterValidateContract,
    HomeFindOneRepository,
} from '@cmz/content-management-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { homeFindOneFilterMapper } from '../mappers/home-find-one-filter.mapper';
import { HomeFindOneMapper } from '../mappers/home-find-one.mapper';
import { HomeFindOneApi } from '../sources/home-find-one.api';

@Service()
export class HomeFindOneRepositoryImpl implements HomeFindOneRepository {
    private readonly api = inject(HomeFindOneApi);
    private readonly mapper = inject(HomeFindOneMapper);

    execute(
        filter: HomeFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<HomeFindOneEntity> {
        const dto = homeFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
