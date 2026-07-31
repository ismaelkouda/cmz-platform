import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    QueuesFinalizationFilterContract,
    QueuesFinalizationEntity,
    QueuesFinalizationRepository,
} from '@cmz/finalization-domain';
import { queuesFinalizationFilterMapper } from '../mappers/queues-finalization-filter.mapper';
import { QueuesFinalizationItemMapper } from '../mappers/queues-finalization-item.mapper';
import { QueuesFinalizationApi } from '../sources/queues-finalization.api';

@Service()
export class QueuesFinalizationRepositoryImpl implements QueuesFinalizationRepository {
    private readonly api = inject(QueuesFinalizationApi);
    private readonly mapper = inject(QueuesFinalizationItemMapper);

    execute(
        validContract: QueuesFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<QueuesFinalizationEntity>> {
        return this.api
            .execute(
                queuesFinalizationFilterMapper(validContract),
                page,
                options
            )
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: QueuesFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<QueuesFinalizationEntity[]> {
        return this.api
            .export(queuesFinalizationFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
