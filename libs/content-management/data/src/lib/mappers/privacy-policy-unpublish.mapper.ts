import { PrivacyPolicyUnpublishValidateContract } from '@cmz/content-management-domain';
import { PrivacyPolicyUnpublishApiDto } from '../dtos/privacy-policy-unpublish-api.dto';

export function privacyPolicyUnpublishMapper(
    validContract: PrivacyPolicyUnpublishValidateContract
): PrivacyPolicyUnpublishApiDto {
    return { uniq_id: validContract.uniqId };
}
