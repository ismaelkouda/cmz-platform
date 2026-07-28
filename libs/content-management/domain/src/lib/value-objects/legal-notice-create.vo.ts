import { LegalNoticeCreateContract } from '../contracts/legal-notice-create.contract';
import { LegalNoticeCreateValidateContract } from '../contracts/legal-notice-create.validate-contract';
import { validateLegalNoticeCreate } from '../validators/legal-notice-create.validator';

export function legalNoticeCreateVo(
    contract: LegalNoticeCreateContract
): LegalNoticeCreateValidateContract {
    validateLegalNoticeCreate(contract);
    return contract;
}
