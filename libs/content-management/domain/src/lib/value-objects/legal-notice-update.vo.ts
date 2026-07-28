import { LegalNoticeUpdateContract } from '../contracts/legal-notice-update.contract';
import { LegalNoticeUpdateValidateContract } from '../contracts/legal-notice-update.validate-contract';
import { validateLegalNoticeUpdate } from '../validators/legal-notice-update.validator';

export function legalNoticeUpdateVo(
    contract: LegalNoticeUpdateContract
): LegalNoticeUpdateValidateContract {
    validateLegalNoticeUpdate(contract);
    return contract;
}
