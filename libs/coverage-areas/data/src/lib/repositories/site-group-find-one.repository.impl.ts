import { Service, inject } from '@angular/core';
import {
    SiteGroupFindOneEntity,
    SiteGroupFindOneFilterValidateContract,
    SiteGroupFindOneRepository,
} from '@cmz/coverage-areas-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { siteGroupFindOneFilterMapper } from '../mappers/site-group-find-one-filter.mapper';
import { SiteGroupFindOneMapper } from '../mappers/site-group-find-one.mapper';
import { SiteGroupFindOneApi } from '../sources/site-group-find-one.api';

@Service()
export class SiteGroupFindOneRepositoryImpl implements SiteGroupFindOneRepository {
    private readonly api = inject(SiteGroupFindOneApi);
    private readonly mapper = inject(SiteGroupFindOneMapper);

    execute(
        validContract: SiteGroupFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<SiteGroupFindOneEntity> {
        const dto = siteGroupFindOneFilterMapper(validContract);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
