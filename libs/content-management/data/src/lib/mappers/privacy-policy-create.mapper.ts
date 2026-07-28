import { PrivacyPolicyCreateValidateContract } from '@cmz/content-management-domain';
import { PrivacyPolicyCreateApiDto } from '../dtos/privacy-policy-create-api.dto';

export function privacyPolicyCreateMapper(
    validContract: PrivacyPolicyCreateValidateContract
): PrivacyPolicyCreateApiDto {
    return { version: validContract.version, content: validContract.content };
}
