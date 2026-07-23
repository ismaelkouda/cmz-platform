import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { InfrastructureSelectRepository } from '@cmz/administrative-infrastructure-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class InfrastructureSelectUseCase {
    private readonly repository = inject(InfrastructureSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
