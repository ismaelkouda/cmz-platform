import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { FiberConstructorSelectRepository } from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class FiberConstructorSelectUseCase {
    private readonly repository = inject(FiberConstructorSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
