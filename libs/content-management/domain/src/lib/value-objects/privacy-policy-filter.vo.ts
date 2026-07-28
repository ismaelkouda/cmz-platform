import { PrivacyPolicyFilterContract } from '../contracts/privacy-policy-filter.contract';
import { validatePrivacyPolicyFilter } from '../validators/privacy-policy-filter.validator';

export function privacyPolicyFilterVo(
    contract: PrivacyPolicyFilterContract
): PrivacyPolicyFilterContract {
    validatePrivacyPolicyFilter(contract);
    return contract;
}
