import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    NewsCategoriesSelectRepository,
    NewsCategoryOption,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

/** `autoProvided: false` (OPS-25bis) — voir docstring de `LoginUseCase` (libs/authentication/application/src/lib/use-cases/login.use-case.ts). */
@Service({ autoProvided: false })
export class NewsCategoriesSelectUseCase {
    private readonly repository = inject(NewsCategoriesSelectRepository);

    execute(options?: FetchOptions): Observable<NewsCategoryOption[]> {
        return defer(() => this.repository.execute(options));
    }
}
