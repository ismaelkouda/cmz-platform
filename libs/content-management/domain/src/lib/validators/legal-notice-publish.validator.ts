import { GenericRequiredError } from '@cmz/shared-domain';
import { LegalNoticePublishContract } from '../contracts/legal-notice-publish.contract';
import { LegalNoticePublishValidateContract } from '../contracts/legal-notice-publish.validate-contract';

export function validateLegalNoticePublish(
    contract: LegalNoticePublishContract
): asserts contract is LegalNoticePublishValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.LEGAL_NOTICE.FORM.ERROR.PUBLISH.UNIQ_ID_REQUIRE'
        );
    }
}
