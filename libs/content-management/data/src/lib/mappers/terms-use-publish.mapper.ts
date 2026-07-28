import { TermsUsePublishValidateContract } from '@cmz/content-management-domain';
import { TermsUsePublishApiDto } from '../dtos/terms-use-publish-api.dto';

export function termsUsePublishMapper(
    validContract: TermsUsePublishValidateContract
): TermsUsePublishApiDto {
    return { uniq_id: validContract.uniqId };
}
