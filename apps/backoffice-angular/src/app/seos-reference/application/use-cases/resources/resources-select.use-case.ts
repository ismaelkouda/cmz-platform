import { Injectable, inject } from '@angular/core';
import { ResourcesSelectRepository } from '@pages/seos-reference/domain/repositories/resources/resources-select.repository';
import { SelectOption } from '@shared/domain/interfaces/select-option.interface';
import { FetchOptions } from '@shared/interface/fetch-options.interface';
import { defer, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResourcesSelectUseCase {
    private readonly repository = inject(ResourcesSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
