import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { TermsUseFindOneEntity } from '../entities/terms-use-find-one.entity';
import { TermsUseFindOneFilterValidateContract } from '../contracts/terms-use-find-one-filter.validate-contract';

export abstract class TermsUseFindOneRepository {
    abstract execute(
        filter: TermsUseFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<TermsUseFindOneEntity>;
}
