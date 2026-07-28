import { TermsUseUnpublishValidateContract } from '@cmz/content-management-domain';
import { TermsUseUnpublishApiDto } from '../dtos/terms-use-unpublish-api.dto';

export function termsUseUnpublishMapper(
    validContract: TermsUseUnpublishValidateContract
): TermsUseUnpublishApiDto {
    return { uniq_id: validContract.uniqId };
}
