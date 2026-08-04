import { Service, inject } from '@angular/core';
import { FetchOptions, SelectOption } from '@cmz/shared-domain';
import { SlideSelectRepository } from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class SlideSelectUseCase {
    private readonly repository = inject(SlideSelectRepository);

    readAll(options?: FetchOptions): Observable<SelectOption[]> {
        return defer(() => this.repository.readAll(options));
    }
}
