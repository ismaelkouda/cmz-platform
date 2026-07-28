import { PrivacyPolicyPublishContract } from '../contracts/privacy-policy-publish.contract';
import { PrivacyPolicyPublishValidateContract } from '../contracts/privacy-policy-publish.validate-contract';
import { validatePrivacyPolicyPublish } from '../validators/privacy-policy-publish.validator';

export function privacyPolicyPublishVo(
    contract: PrivacyPolicyPublishContract
): PrivacyPolicyPublishValidateContract {
    validatePrivacyPolicyPublish(contract);
    return contract;
}
