import { PrivacyPolicyFindOneFilterValidateContract } from '@cmz/content-management-domain';
import { PrivacyPolicyFindOneFilterApiDto } from '../dtos/privacy-policy-find-one-filter-api.dto';

export function privacyPolicyFindOneFilterMapper(
    validContract: PrivacyPolicyFindOneFilterValidateContract
): PrivacyPolicyFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
