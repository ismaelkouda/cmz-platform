import { Service, inject } from '@angular/core';
import { TermsUseSelectRepository } from '@cmz/content-management-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { TermsUseSelectMapper } from '../mappers/terms-use-select.mapper';
import { TermsUseSelectApi } from '../sources/terms-use-select.api';

@Service()
export class TermsUseSelectRepositoryImpl implements TermsUseSelectRepository {
    private readonly api = inject(TermsUseSelectApi);
    private readonly mapper = inject(TermsUseSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
