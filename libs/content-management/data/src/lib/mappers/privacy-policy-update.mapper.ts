import { PrivacyPolicyUpdateValidateContract } from '@cmz/content-management-domain';
import { PrivacyPolicyUpdateApiDto } from '../dtos/privacy-policy-update-api.dto';

export function privacyPolicyUpdateMapper(
    validContract: PrivacyPolicyUpdateValidateContract
): PrivacyPolicyUpdateApiDto {
    return {
        id: validContract.uniqId,
        version: validContract.version,
        content: validContract.content,
    };
}
