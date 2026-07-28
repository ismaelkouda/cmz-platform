import { LegalNoticeDeleteContract } from '../contracts/legal-notice-delete.contract';
import { LegalNoticeDeleteValidateContract } from '../contracts/legal-notice-delete.validate-contract';
import { validateLegalNoticeDelete } from '../validators/legal-notice-delete.validator';

export function legalNoticeDeleteVo(
    contract: LegalNoticeDeleteContract
): LegalNoticeDeleteValidateContract {
    validateLegalNoticeDelete(contract);
    return contract;
}
