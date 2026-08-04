import { Service, inject } from '@angular/core';
import { NewsSelectRepository } from '@cmz/content-management-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { NewsSelectMapper } from '../mappers/news-select.mapper';
import { NewsSelectApi } from '../sources/news-select.api';

@Service()
export class NewsSelectRepositoryImpl implements NewsSelectRepository {
    private readonly api = inject(NewsSelectApi);
    private readonly mapper = inject(NewsSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
