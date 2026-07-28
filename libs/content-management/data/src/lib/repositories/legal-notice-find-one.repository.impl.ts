import { Service, inject } from '@angular/core';
import {
    LegalNoticeFindOneEntity,
    LegalNoticeFindOneFilterValidateContract,
    LegalNoticeFindOneRepository,
} from '@cmz/content-management-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { legalNoticeFindOneFilterMapper } from '../mappers/legal-notice-find-one-filter.mapper';
import { LegalNoticeFindOneMapper } from '../mappers/legal-notice-find-one.mapper';
import { LegalNoticeFindOneApi } from '../sources/legal-notice-find-one.api';

@Service()
export class LegalNoticeFindOneRepositoryImpl implements LegalNoticeFindOneRepository {
    private readonly api = inject(LegalNoticeFindOneApi);
    private readonly mapper = inject(LegalNoticeFindOneMapper);

    execute(
        filter: LegalNoticeFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<LegalNoticeFindOneEntity> {
        const dto = legalNoticeFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
