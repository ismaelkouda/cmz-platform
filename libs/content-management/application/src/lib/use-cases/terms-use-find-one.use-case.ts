import { Service, inject } from '@angular/core';
import { FetchOptions } from '@cmz/shared-domain';
import {
    TermsUseFindOneEntity,
    TermsUseFindOneFilterContract,
    TermsUseFindOneRepository,
    termsUseFindOneFilterVo,
} from '@cmz/content-management-domain';
import { Observable, defer } from 'rxjs';

@Service()
export class TermsUseFindOneUseCase {
    private readonly repository = inject(TermsUseFindOneRepository);

    execute(
        contract: TermsUseFindOneFilterContract,
        options?: FetchOptions
    ): Observable<TermsUseFindOneEntity> {
        return defer(() =>
            this.repository.execute(termsUseFindOneFilterVo(contract), options)
        );
    }
}
