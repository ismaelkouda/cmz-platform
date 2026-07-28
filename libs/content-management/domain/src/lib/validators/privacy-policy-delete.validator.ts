import { GenericRequiredError } from '@cmz/shared-domain';
import { PrivacyPolicyDeleteContract } from '../contracts/privacy-policy-delete.contract';
import { PrivacyPolicyDeleteValidateContract } from '../contracts/privacy-policy-delete.validate-contract';

export function validatePrivacyPolicyDelete(
    contract: PrivacyPolicyDeleteContract
): asserts contract is PrivacyPolicyDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
