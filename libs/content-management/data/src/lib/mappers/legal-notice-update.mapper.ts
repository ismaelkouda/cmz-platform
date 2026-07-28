import { LegalNoticeUpdateValidateContract } from '@cmz/content-management-domain';
import { LegalNoticeUpdateApiDto } from '../dtos/legal-notice-update-api.dto';

export function legalNoticeUpdateMapper(
    validContract: LegalNoticeUpdateValidateContract
): LegalNoticeUpdateApiDto {
    return {
        id: validContract.uniqId,
        version: validContract.version,
        content: validContract.content,
    };
}
