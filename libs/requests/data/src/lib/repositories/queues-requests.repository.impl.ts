import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    QueuesRequestsFilterContract,
    QueuesRequestsEntity,
    QueuesRequestsRepository,
} from '@cmz/requests-domain';
import { queuesRequestsFilterMapper } from '../mappers/queues-requests-filter.mapper';
import { QueuesRequestsItemMapper } from '../mappers/queues-requests-item.mapper';
import { QueuesRequestsApi } from '../sources/queues-requests.api';

@Service()
export class QueuesRequestsRepositoryImpl implements QueuesRequestsRepository {
    private readonly api = inject(QueuesRequestsApi);
    private readonly mapper = inject(QueuesRequestsItemMapper);

    execute(
        validContract: QueuesRequestsFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesRequestsEntity>> {
        return this.api
            .execute(queuesRequestsFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: QueuesRequestsFilterContract,
        options?: FetchOptions
    ): Observable<QueuesRequestsEntity[]> {
        return this.api
            .export(queuesRequestsFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
