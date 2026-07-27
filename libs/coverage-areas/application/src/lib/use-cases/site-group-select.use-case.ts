import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { SiteGroupSelectRepository } from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class SiteGroupSelectUseCase {
    private readonly repository = inject(SiteGroupSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
