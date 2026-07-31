import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    QueuesProcessingFilterContract,
    QueuesProcessingEntity,
    QueuesProcessingRepository,
} from '@cmz/processing-domain';
import { queuesProcessingFilterMapper } from '../mappers/queues-processing-filter.mapper';
import { QueuesProcessingItemMapper } from '../mappers/queues-processing-item.mapper';
import { QueuesProcessingApi } from '../sources/queues-processing.api';

@Service()
export class QueuesProcessingRepositoryImpl implements QueuesProcessingRepository {
    private readonly api = inject(QueuesProcessingApi);
    private readonly mapper = inject(QueuesProcessingItemMapper);

    execute(
        validContract: QueuesProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesProcessingEntity>> {
        return this.api
            .execute(queuesProcessingFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: QueuesProcessingFilterContract,
        options?: FetchOptions
    ): Observable<QueuesProcessingEntity[]> {
        return this.api
            .export(queuesProcessingFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
