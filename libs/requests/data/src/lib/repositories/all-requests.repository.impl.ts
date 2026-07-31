import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AllRequestsFilterContract,
    AllRequestsEntity,
    AllRequestsRepository,
} from '@cmz/requests-domain';
import { allRequestsFilterMapper } from '../mappers/all-requests-filter.mapper';
import { AllRequestsItemMapper } from '../mappers/all-requests-item.mapper';
import { AllRequestsApi } from '../sources/all-requests.api';

@Service()
export class AllRequestsRepositoryImpl implements AllRequestsRepository {
    private readonly api = inject(AllRequestsApi);
    private readonly mapper = inject(AllRequestsItemMapper);

    execute(
        validContract: AllRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllRequestsEntity>> {
        return this.api
            .execute(allRequestsFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: AllRequestsFilterContract,
        options?: FetchOptions
    ): Observable<AllRequestsEntity[]> {
        return this.api
            .export(allRequestsFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
