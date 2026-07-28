import { GenericRequiredError } from '@cmz/shared-domain';
import { LegalNoticeUnpublishContract } from '../contracts/legal-notice-unpublish.contract';
import { LegalNoticeUnpublishValidateContract } from '../contracts/legal-notice-unpublish.validate-contract';

export function validateLegalNoticeUnpublish(
    contract: LegalNoticeUnpublishContract
): asserts contract is LegalNoticeUnpublishValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.LEGAL_NOTICE.FORM.ERROR.UNPUBLISH.UNIQ_ID_REQUIRE'
        );
    }
}
