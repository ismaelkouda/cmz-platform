import { LegalNoticeUnpublishContract } from '../contracts/legal-notice-unpublish.contract';
import { LegalNoticeUnpublishValidateContract } from '../contracts/legal-notice-unpublish.validate-contract';
import { validateLegalNoticeUnpublish } from '../validators/legal-notice-unpublish.validator';

export function legalNoticeUnpublishVo(
    contract: LegalNoticeUnpublishContract
): LegalNoticeUnpublishValidateContract {
    validateLegalNoticeUnpublish(contract);
    return contract;
}
