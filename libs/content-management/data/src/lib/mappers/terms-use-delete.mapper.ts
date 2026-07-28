import { TermsUseDeleteValidateContract } from '@cmz/content-management-domain';
import { TermsUseDeleteApiDto } from '../dtos/terms-use-delete-api.dto';

export function termsUseDeleteMapper(
    validContract: TermsUseDeleteValidateContract
): TermsUseDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
