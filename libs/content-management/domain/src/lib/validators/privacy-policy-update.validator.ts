import { GenericRequiredError } from '@cmz/shared-domain';
import { PrivacyPolicyUpdateContract } from '../contracts/privacy-policy-update.contract';
import { PrivacyPolicyUpdateValidateContract } from '../contracts/privacy-policy-update.validate-contract';

export function validatePrivacyPolicyUpdate(
    contract: PrivacyPolicyUpdateContract
): asserts contract is PrivacyPolicyUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.version) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.UPDATE.VERSION_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.UPDATE.CONTENT_REQUIRE'
        );
    }
}
