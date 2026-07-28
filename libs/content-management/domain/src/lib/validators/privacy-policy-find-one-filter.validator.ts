import { GenericRequiredError } from '@cmz/shared-domain';
import { PrivacyPolicyFindOneFilterContract } from '../contracts/privacy-policy-find-one-filter.contract';
import { PrivacyPolicyFindOneFilterValidateContract } from '../contracts/privacy-policy-find-one-filter.validate-contract';

export function validatePrivacyPolicyFindOneFilter(
    contract: PrivacyPolicyFindOneFilterContract
): asserts contract is PrivacyPolicyFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.PRIVACY_POLICY.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
