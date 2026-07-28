import { TermsUseFindOneFilterValidateContract } from '@cmz/content-management-domain';
import { TermsUseFindOneFilterApiDto } from '../dtos/terms-use-find-one-filter-api.dto';

export function termsUseFindOneFilterMapper(
    validContract: TermsUseFindOneFilterValidateContract
): TermsUseFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
