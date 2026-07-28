import { LegalNoticeCreateValidateContract } from '@cmz/content-management-domain';
import { LegalNoticeCreateApiDto } from '../dtos/legal-notice-create-api.dto';

export function legalNoticeCreateMapper(
    validContract: LegalNoticeCreateValidateContract
): LegalNoticeCreateApiDto {
    return { version: validContract.version, content: validContract.content };
}
