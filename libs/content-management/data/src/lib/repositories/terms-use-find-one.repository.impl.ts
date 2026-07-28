import { Service, inject } from '@angular/core';
import {
    TermsUseFindOneEntity,
    TermsUseFindOneFilterValidateContract,
    TermsUseFindOneRepository,
} from '@cmz/content-management-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { termsUseFindOneFilterMapper } from '../mappers/terms-use-find-one-filter.mapper';
import { TermsUseFindOneMapper } from '../mappers/terms-use-find-one.mapper';
import { TermsUseFindOneApi } from '../sources/terms-use-find-one.api';

@Service()
export class TermsUseFindOneRepositoryImpl implements TermsUseFindOneRepository {
    private readonly api = inject(TermsUseFindOneApi);
    private readonly mapper = inject(TermsUseFindOneMapper);

    execute(
        filter: TermsUseFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<TermsUseFindOneEntity> {
        const dto = termsUseFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
