import { Service, inject } from '@angular/core';
import { FiberConstructorSelectRepository } from '@cmz/coverage-areas-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { FiberConstructorSelectMapper } from '../mappers/fiber-constructor-select.mapper';
import { FiberConstructorSelectApi } from '../sources/fiber-constructor-select.api';

@Service()
export class FiberConstructorSelectRepositoryImpl implements FiberConstructorSelectRepository {
    private readonly api = inject(FiberConstructorSelectApi);
    private readonly mapper = inject(FiberConstructorSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
