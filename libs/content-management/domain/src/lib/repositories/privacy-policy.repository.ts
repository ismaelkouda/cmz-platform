import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import { Observable } from 'rxjs';
import { PrivacyPolicyEntity } from '../entities/privacy-policy.entity';
import { PrivacyPolicyCreateValidateContract } from '../contracts/privacy-policy-create.validate-contract';
import { PrivacyPolicyUpdateValidateContract } from '../contracts/privacy-policy-update.validate-contract';
import { PrivacyPolicyDeleteValidateContract } from '../contracts/privacy-policy-delete.validate-contract';
import { PrivacyPolicyPublishValidateContract } from '../contracts/privacy-policy-publish.validate-contract';
import { PrivacyPolicyUnpublishValidateContract } from '../contracts/privacy-policy-unpublish.validate-contract';
import { PrivacyPolicyFilterContract } from '../contracts/privacy-policy-filter.contract';

export abstract class PrivacyPolicyRepository {
    abstract execute(
        filter: PrivacyPolicyFilterContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<PrivacyPolicyEntity>>;
    abstract create(
        contract: PrivacyPolicyCreateValidateContract
    ): Observable<MessageEntity>;
    abstract update(
        contract: PrivacyPolicyUpdateValidateContract
    ): Observable<MessageEntity>;
    abstract delete(
        contract: PrivacyPolicyDeleteValidateContract
    ): Observable<MessageEntity>;
    abstract publish(
        contract: PrivacyPolicyPublishValidateContract
    ): Observable<MessageEntity>;
    abstract unpublish(
        contract: PrivacyPolicyUnpublishValidateContract
    ): Observable<MessageEntity>;
}
