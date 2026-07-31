import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { FetchOptions, PageResult } from '@cmz/shared-domain';
import {
    AllFinalizationFilterContract,
    AllFinalizationEntity,
    AllFinalizationRepository,
} from '@cmz/finalization-domain';
import { allFinalizationFilterMapper } from '../mappers/all-finalization-filter.mapper';
import { AllFinalizationItemMapper } from '../mappers/all-finalization-item.mapper';
import { AllFinalizationApi } from '../sources/all-finalization.api';

@Service()
export class AllFinalizationRepositoryImpl implements AllFinalizationRepository {
    private readonly api = inject(AllFinalizationApi);
    private readonly mapper = inject(AllFinalizationItemMapper);

    execute(
        validContract: AllFinalizationFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<AllFinalizationEntity>> {
        return this.api
            .execute(allFinalizationFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    export(
        validContract: AllFinalizationFilterContract,
        options?: FetchOptions
    ): Observable<AllFinalizationEntity[]> {
        return this.api
            .export(allFinalizationFilterMapper(validContract), options)
            .pipe(map((response) => this.mapper.mapFromDto(response).items));
    }
}
