import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { LegalNoticeSelectRepository } from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class LegalNoticeSelectUseCase {
    private readonly repository = inject(LegalNoticeSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
