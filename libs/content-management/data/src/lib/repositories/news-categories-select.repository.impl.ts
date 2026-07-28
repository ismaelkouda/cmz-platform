import { Service, inject } from '@angular/core';
import {
    NewsCategoriesSelectRepository,
    NewsCategoryOption,
} from '@cmz/content-management-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { NewsCategoriesSelectMapper } from '../mappers/news-categories-select.mapper';
import { NewsCategoriesSelectApi } from '../sources/news-categories-select.api';

@Service()
export class NewsCategoriesSelectRepositoryImpl implements NewsCategoriesSelectRepository {
    private readonly api = inject(NewsCategoriesSelectApi);
    private readonly mapper = inject(NewsCategoriesSelectMapper);

    execute(options?: FetchOptions): Observable<NewsCategoryOption[]> {
        return this.api
            .execute(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
