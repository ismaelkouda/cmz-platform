import { Service, inject } from '@angular/core';
import { TowerTypeSelectRepository } from '@cmz/coverage-areas-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { TowerTypeSelectMapper } from '../mappers/tower-type-select.mapper';
import { TowerTypeSelectApi } from '../sources/tower-type-select.api';

@Service()
export class TowerTypeSelectRepositoryImpl implements TowerTypeSelectRepository {
    private readonly api = inject(TowerTypeSelectApi);
    private readonly mapper = inject(TowerTypeSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
