import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { NewsSelectRepository } from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class NewsSelectUseCase {
    private readonly repository = inject(NewsSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
