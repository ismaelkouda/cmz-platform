import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    DepartmentOption,
    DepartmentSelectRepository,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class DepartmentSelectUseCase {
    private readonly repository = inject(DepartmentSelectRepository);

    readAll(options?: FetchOptions): Observable<DepartmentOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
