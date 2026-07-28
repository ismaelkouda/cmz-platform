import { LegalNoticeFindOneFilterContract } from '../contracts/legal-notice-find-one-filter.contract';
import { LegalNoticeFindOneFilterValidateContract } from '../contracts/legal-notice-find-one-filter.validate-contract';
import { validateLegalNoticeFindOneFilter } from '../validators/legal-notice-find-one-filter.validator';

export function legalNoticeFindOneFilterVo(
    contract: LegalNoticeFindOneFilterContract
): LegalNoticeFindOneFilterValidateContract {
    validateLegalNoticeFindOneFilter(contract);
    return contract;
}
