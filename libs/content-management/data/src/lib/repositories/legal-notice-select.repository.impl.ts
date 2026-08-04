import { Service, inject } from '@angular/core';
import { LegalNoticeSelectRepository } from '@cmz/content-management-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { LegalNoticeSelectMapper } from '../mappers/legal-notice-select.mapper';
import { LegalNoticeSelectApi } from '../sources/legal-notice-select.api';

@Service()
export class LegalNoticeSelectRepositoryImpl
    implements LegalNoticeSelectRepository
{
    private readonly api = inject(LegalNoticeSelectApi);
    private readonly mapper = inject(LegalNoticeSelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
