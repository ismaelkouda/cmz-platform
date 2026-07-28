import { LegalNoticePublishContract } from '../contracts/legal-notice-publish.contract';
import { LegalNoticePublishValidateContract } from '../contracts/legal-notice-publish.validate-contract';
import { validateLegalNoticePublish } from '../validators/legal-notice-publish.validator';

export function legalNoticePublishVo(
    contract: LegalNoticePublishContract
): LegalNoticePublishValidateContract {
    validateLegalNoticePublish(contract);
    return contract;
}
