import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { RadioRelayLinksSelectRepository } from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class RadioRelayLinksSelectUseCase {
    private readonly repository = inject(RadioRelayLinksSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
