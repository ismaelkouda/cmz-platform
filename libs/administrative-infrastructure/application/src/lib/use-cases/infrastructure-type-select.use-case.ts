import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { InfrastructureTypeSelectRepository } from '@cmz/administrative-infrastructure-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class InfrastructureTypeSelectUseCase {
    private readonly repository = inject(InfrastructureTypeSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
