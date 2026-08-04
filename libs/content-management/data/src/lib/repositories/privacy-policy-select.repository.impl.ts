import { Service, inject } from '@angular/core';
import { PrivacyPolicySelectRepository } from '@cmz/content-management-domain';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { map, Observable } from 'rxjs';
import { PrivacyPolicySelectMapper } from '../mappers/privacy-policy-select.mapper';
import { PrivacyPolicySelectApi } from '../sources/privacy-policy-select.api';

@Service()
export class PrivacyPolicySelectRepositoryImpl
    implements PrivacyPolicySelectRepository
{
    private readonly api = inject(PrivacyPolicySelectApi);
    private readonly mapper = inject(PrivacyPolicySelectMapper);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return this.api
            .readAll(options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }
}
