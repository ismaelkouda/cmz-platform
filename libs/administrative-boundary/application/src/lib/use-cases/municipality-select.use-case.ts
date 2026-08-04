import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    MunicipalityOption,
    MunicipalitySelectRepository,
} from '@cmz/administrative-boundary-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class MunicipalitySelectUseCase {
    private readonly repository = inject(MunicipalitySelectRepository);

    readAll(options?: FetchOptions): Observable<MunicipalityOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
