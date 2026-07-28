import { PrivacyPolicyUpdateContract } from '../contracts/privacy-policy-update.contract';
import { PrivacyPolicyUpdateValidateContract } from '../contracts/privacy-policy-update.validate-contract';
import { validatePrivacyPolicyUpdate } from '../validators/privacy-policy-update.validator';

export function privacyPolicyUpdateVo(
    contract: PrivacyPolicyUpdateContract
): PrivacyPolicyUpdateValidateContract {
    validatePrivacyPolicyUpdate(contract);
    return contract;
}
