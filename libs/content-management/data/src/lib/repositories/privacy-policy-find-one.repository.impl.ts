import { Service, inject } from '@angular/core';
import {
    PrivacyPolicyFindOneEntity,
    PrivacyPolicyFindOneFilterValidateContract,
    PrivacyPolicyFindOneRepository,
} from '@cmz/content-management-domain';
import { FetchOptions } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { privacyPolicyFindOneFilterMapper } from '../mappers/privacy-policy-find-one-filter.mapper';
import { PrivacyPolicyFindOneMapper } from '../mappers/privacy-policy-find-one.mapper';
import { PrivacyPolicyFindOneApi } from '../sources/privacy-policy-find-one.api';

@Service()
export class PrivacyPolicyFindOneRepositoryImpl implements PrivacyPolicyFindOneRepository {
    private readonly api = inject(PrivacyPolicyFindOneApi);
    private readonly mapper = inject(PrivacyPolicyFindOneMapper);

    execute(
        filter: PrivacyPolicyFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<PrivacyPolicyFindOneEntity> {
        const dto = privacyPolicyFindOneFilterMapper(filter);
        return this.api
            .execute(dto, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
