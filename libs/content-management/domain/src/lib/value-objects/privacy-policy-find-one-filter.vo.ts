import { PrivacyPolicyFindOneFilterContract } from '../contracts/privacy-policy-find-one-filter.contract';
import { PrivacyPolicyFindOneFilterValidateContract } from '../contracts/privacy-policy-find-one-filter.validate-contract';
import { validatePrivacyPolicyFindOneFilter } from '../validators/privacy-policy-find-one-filter.validator';

export function privacyPolicyFindOneFilterVo(
    contract: PrivacyPolicyFindOneFilterContract
): PrivacyPolicyFindOneFilterValidateContract {
    validatePrivacyPolicyFindOneFilter(contract);
    return contract;
}
