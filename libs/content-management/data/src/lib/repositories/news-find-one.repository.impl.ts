import { Service, inject } from '@angular/core';
import {
    NewsFindOneEntity,
    NewsFindOneFilterValidateContract,
    NewsFindOneRepository,
} from '@cmz/content-management-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { newsFindOneFilterMapper } from '../mappers/news-find-one-filter.mapper';
import { NewsFindOneMapper } from '../mappers/news-find-one.mapper';
import { NewsFindOneApi } from '../sources/news-find-one.api';

@Service()
export class NewsFindOneRepositoryImpl implements NewsFindOneRepository {
    private readonly api = inject(NewsFindOneApi);
    private readonly mapper = inject(NewsFindOneMapper);

    execute(
        filter: NewsFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<NewsFindOneEntity> {
        const dto = newsFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
