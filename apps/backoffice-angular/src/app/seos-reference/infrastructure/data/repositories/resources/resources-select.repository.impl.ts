import { Injectable, inject } from '@angular/core';
import { ResourcesSelectRepository } from '@pages/seos-reference/domain/repositories/resources/resources-select.repository';
import { ResourcesSelectMapper } from '@pages/seos-reference/infrastructure/data/mappers/resources/resources-select.mapper';
import { ResourcesSelectApi } from '@pages/seos-reference/infrastructure/data/sources/resources/resources-select.api';
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { Observable, map } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ResourcesSelectRepositoryImpl implements ResourcesSelectRepository {
    private readonly api = inject(ResourcesSelectApi);
    private readonly mapper = inject(ResourcesSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
