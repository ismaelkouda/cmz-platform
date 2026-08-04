import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { TermsUseSelectRepository } from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class TermsUseSelectUseCase {
    private readonly repository = inject(TermsUseSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
