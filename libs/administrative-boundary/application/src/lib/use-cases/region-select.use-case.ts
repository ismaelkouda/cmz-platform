import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    RegionOption,
    RegionSelectRepository,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class RegionSelectUseCase {
    private readonly repository = inject(RegionSelectRepository);

    readAll(options?: FetchOptions): Observable<RegionOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
