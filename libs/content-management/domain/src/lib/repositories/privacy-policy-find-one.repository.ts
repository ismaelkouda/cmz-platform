import { FetchOptions } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { PrivacyPolicyFindOneEntity } from '../entities/privacy-policy-find-one.entity';
import { PrivacyPolicyFindOneFilterValidateContract } from '../contracts/privacy-policy-find-one-filter.validate-contract';

export abstract class PrivacyPolicyFindOneRepository {
    abstract execute(
        filter: PrivacyPolicyFindOneFilterValidateContract,
        options?: FetchOptions
    ): Observable<PrivacyPolicyFindOneEntity>;
}
