import { PrivacyPolicyDeleteContract } from '../contracts/privacy-policy-delete.contract';
import { PrivacyPolicyDeleteValidateContract } from '../contracts/privacy-policy-delete.validate-contract';
import { validatePrivacyPolicyDelete } from '../validators/privacy-policy-delete.validator';

export function privacyPolicyDeleteVo(
    contract: PrivacyPolicyDeleteContract
): PrivacyPolicyDeleteValidateContract {
    validatePrivacyPolicyDelete(contract);
    return contract;
}
