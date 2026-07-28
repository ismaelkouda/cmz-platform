import { LegalNoticeFilterContract } from '../contracts/legal-notice-filter.contract';
import { validateLegalNoticeFilter } from '../validators/legal-notice-filter.validator';

export function legalNoticeFilterVo(
    contract: LegalNoticeFilterContract
): LegalNoticeFilterContract {
    validateLegalNoticeFilter(contract);
    return contract;
}
