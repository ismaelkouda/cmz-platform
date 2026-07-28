import { GenericRequiredError } from '@cmz/shared-domain';
import { LegalNoticeDeleteContract } from '../contracts/legal-notice-delete.contract';
import { LegalNoticeDeleteValidateContract } from '../contracts/legal-notice-delete.validate-contract';

export function validateLegalNoticeDelete(
    contract: LegalNoticeDeleteContract
): asserts contract is LegalNoticeDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.LEGAL_NOTICE.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
