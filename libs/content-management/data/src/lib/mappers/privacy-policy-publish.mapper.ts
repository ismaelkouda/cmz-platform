import { PrivacyPolicyPublishValidateContract } from '@cmz/content-management-domain';
import { PrivacyPolicyPublishApiDto } from '../dtos/privacy-policy-publish-api.dto';

export function privacyPolicyPublishMapper(
    validContract: PrivacyPolicyPublishValidateContract
): PrivacyPolicyPublishApiDto {
    return { uniq_id: validContract.uniqId };
}
