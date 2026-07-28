import { PrivacyPolicyCreateContract } from '../contracts/privacy-policy-create.contract';
import { PrivacyPolicyCreateValidateContract } from '../contracts/privacy-policy-create.validate-contract';
import { validatePrivacyPolicyCreate } from '../validators/privacy-policy-create.validator';

export function privacyPolicyCreateVo(
    contract: PrivacyPolicyCreateContract
): PrivacyPolicyCreateValidateContract {
    validatePrivacyPolicyCreate(contract);
    return contract;
}
