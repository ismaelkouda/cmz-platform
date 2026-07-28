import { GenericRequiredError } from '@cmz/shared-domain';
import { PrivacyPolicyCreateContract } from '../contracts/privacy-policy-create.contract';
import { PrivacyPolicyCreateValidateContract } from '../contracts/privacy-policy-create.validate-contract';

export function validatePrivacyPolicyCreate(
    contract: PrivacyPolicyCreateContract
): asserts contract is PrivacyPolicyCreateValidateContract {
    if (!contract.version) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.CREATE.VERSION_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.CREATE.CONTENT_REQUIRE'
        );
    }
}
