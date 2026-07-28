import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { LegalNoticeFindOneEntity } from '../entities/legal-notice-find-one.entity';
import { LegalNoticeFindOneFilterValidateContract } from '../contracts/legal-notice-find-one-filter.validate-contract';

export abstract class LegalNoticeFindOneRepository {
    abstract execute(
        filter: LegalNoticeFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<LegalNoticeFindOneEntity>;
}
