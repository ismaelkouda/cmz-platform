import { Service, inject } from '@angular/core';
import { SiteGroupSelectRepository } from '@cmz/coverage-areas-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { SiteGroupSelectMapper } from '../mappers/site-group-select.mapper';
import { SiteGroupSelectApi } from '../sources/site-group-select.api';

@Service()
export class SiteGroupSelectRepositoryImpl implements SiteGroupSelectRepository {
    private readonly api = inject(SiteGroupSelectApi);
    private readonly mapper = inject(SiteGroupSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
