import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    NewsCategoriesSelectRepository,
    NewsCategoryOption,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class NewsCategoriesSelectUseCase {
    private readonly repository = inject(NewsCategoriesSelectRepository);

    execute(options?: FetchOptions): Observable<NewsCategoryOption[]> {
        return defer(() => this.repository.execute(options));
    }
}
