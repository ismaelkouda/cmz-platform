import { GenericRequiredError } from '@cmz/shared-domain';
import { PrivacyPolicyPublishContract } from '../contracts/privacy-policy-publish.contract';
import { PrivacyPolicyPublishValidateContract } from '../contracts/privacy-policy-publish.validate-contract';

export function validatePrivacyPolicyPublish(
    contract: PrivacyPolicyPublishContract
): asserts contract is PrivacyPolicyPublishValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.PUBLISH.UNIQ_ID_REQUIRE'
        );
    }
}
