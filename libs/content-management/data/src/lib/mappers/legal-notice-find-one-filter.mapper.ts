import { LegalNoticeFindOneFilterValidateContract } from '@cmz/content-management-domain';
import { LegalNoticeFindOneFilterApiDto } from '../dtos/legal-notice-find-one-filter-api.dto';

export function legalNoticeFindOneFilterMapper(
    validContract: LegalNoticeFindOneFilterValidateContract
): LegalNoticeFindOneFilterApiDto {
    return { id: validContract.uniqId };
}
