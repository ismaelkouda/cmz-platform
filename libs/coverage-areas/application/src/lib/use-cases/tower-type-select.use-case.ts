import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { TowerTypeSelectRepository } from '@cmz/coverage-areas-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class TowerTypeSelectUseCase {
    private readonly repository = inject(TowerTypeSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
