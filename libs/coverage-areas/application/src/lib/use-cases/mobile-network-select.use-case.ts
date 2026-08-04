import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { MobileNetworkSelectRepository } from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class MobileNetworkSelectUseCase {
    private readonly repository = inject(MobileNetworkSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
