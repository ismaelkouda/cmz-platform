import { GenericRequiredError } from '@cmz/shared-domain';
import { PrivacyPolicyUnpublishContract } from '../contracts/privacy-policy-unpublish.contract';
import { PrivacyPolicyUnpublishValidateContract } from '../contracts/privacy-policy-unpublish.validate-contract';

export function validatePrivacyPolicyUnpublish(
    contract: PrivacyPolicyUnpublishContract
): asserts contract is PrivacyPolicyUnpublishValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.UNPUBLISH.UNIQ_ID_REQUIRE'
        );
    }
}
