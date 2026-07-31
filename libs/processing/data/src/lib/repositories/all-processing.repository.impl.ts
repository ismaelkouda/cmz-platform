import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AllProcessingFilterContract,
    AllProcessingEntity,
    AllProcessingRepository,
} from '@cmz/processing-domain';
import { allProcessingFilterMapper } from '../mappers/all-processing-filter.mapper';
import { AllProcessingItemMapper } from '../mappers/all-processing-item.mapper';
import { AllProcessingApi } from '../sources/all-processing.api';

@Service()
export class AllProcessingRepositoryImpl implements AllProcessingRepository {
    private readonly api = inject(AllProcessingApi);
    private readonly mapper = inject(AllProcessingItemMapper);

    execute(
        validContract: AllProcessingFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllProcessingEntity>> {
        return this.api
            .execute(allProcessingFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: AllProcessingFilterContract,
        options?: FetchOptions
    ): Observable<AllProcessingEntity[]> {
        return this.api
            .export(allProcessingFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
