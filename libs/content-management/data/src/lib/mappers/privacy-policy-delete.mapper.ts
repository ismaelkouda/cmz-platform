import { PrivacyPolicyDeleteValidateContract } from '@cmz/content-management-domain';
import { PrivacyPolicyDeleteApiDto } from '../dtos/privacy-policy-delete-api.dto';

export function privacyPolicyDeleteMapper(
    validContract: PrivacyPolicyDeleteValidateContract
): PrivacyPolicyDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
