import { PrivacyPolicyUnpublishContract } from '../contracts/privacy-policy-unpublish.contract';
import { PrivacyPolicyUnpublishValidateContract } from '../contracts/privacy-policy-unpublish.validate-contract';
import { validatePrivacyPolicyUnpublish } from '../validators/privacy-policy-unpublish.validator';

export function privacyPolicyUnpublishVo(
    contract: PrivacyPolicyUnpublishContract
): PrivacyPolicyUnpublishValidateContract {
    validatePrivacyPolicyUnpublish(contract);
    return contract;
}
