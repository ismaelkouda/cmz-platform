import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { PrivacyPolicySelectRepository } from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class PrivacyPolicySelectUseCase {
    private readonly repository = inject(PrivacyPolicySelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
