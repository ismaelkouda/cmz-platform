import { Service, inject } from '@angular/core';
import { HomeSelectRepository } from '@cmz/content-management-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { HomeSelectMapper } from '../mappers/home-select.mapper';
import { HomeSelectApi } from '../sources/home-select.api';

@Service()
export class HomeSelectRepositoryImpl implements HomeSelectRepository {
    private readonly api = inject(HomeSelectApi);
    private readonly mapper = inject(HomeSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
