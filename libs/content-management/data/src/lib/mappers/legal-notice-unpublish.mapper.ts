import { LegalNoticeUnpublishValidateContract } from '@cmz/content-management-domain';
import { LegalNoticeUnpublishApiDto } from '../dtos/legal-notice-unpublish-api.dto';

export function legalNoticeUnpublishMapper(
    validContract: LegalNoticeUnpublishValidateContract
): LegalNoticeUnpublishApiDto {
    return { uniq_id: validContract.uniqId };
}
