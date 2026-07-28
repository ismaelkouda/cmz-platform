import { LegalNoticeDeleteValidateContract } from '@cmz/content-management-domain';
import { LegalNoticeDeleteApiDto } from '../dtos/legal-notice-delete-api.dto';

export function legalNoticeDeleteMapper(
    validContract: LegalNoticeDeleteValidateContract
): LegalNoticeDeleteApiDto {
    return { uniq_id: validContract.uniqId };
}
