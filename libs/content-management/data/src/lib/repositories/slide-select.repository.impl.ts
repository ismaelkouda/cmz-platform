import { Service, inject } from '@angular/core';
import { SlideSelectRepository } from '@cmz/content-management-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { SlideSelectMapper } from '../mappers/slide-select.mapper';
import { SlideSelectApi } from '../sources/slide-select.api';

@Service()
export class SlideSelectRepositoryImpl implements SlideSelectRepository {
    private readonly api = inject(SlideSelectApi);
    private readonly mapper = inject(SlideSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
