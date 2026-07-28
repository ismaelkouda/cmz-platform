import { GenericRequiredError } from '@cmz/shared-domain';
import { LegalNoticeCreateContract } from '../contracts/legal-notice-create.contract';
import { LegalNoticeCreateValidateContract } from '../contracts/legal-notice-create.validate-contract';

export function validateLegalNoticeCreate(
    contract: LegalNoticeCreateContract
): asserts contract is LegalNoticeCreateValidateContract {
    if (!contract.version) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.LEGAL_NOTICE.FORM.ERROR.CREATE.VERSION_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.LEGAL_NOTICE.FORM.ERROR.CREATE.CONTENT_REQUIRE'
        );
    }
}
