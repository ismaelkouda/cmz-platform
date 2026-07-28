import { LegalNoticePublishValidateContract } from '@cmz/content-management-domain';
import { LegalNoticePublishApiDto } from '../dtos/legal-notice-publish-api.dto';

export function legalNoticePublishMapper(
    validContract: LegalNoticePublishValidateContract
): LegalNoticePublishApiDto {
    return { uniq_id: validContract.uniqId };
}
