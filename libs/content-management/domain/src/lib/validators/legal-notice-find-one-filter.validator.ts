import { GenericRequiredError } from '@cmz/shared-domain';
import { LegalNoticeFindOneFilterContract } from '../contracts/legal-notice-find-one-filter.contract';
import { LegalNoticeFindOneFilterValidateContract } from '../contracts/legal-notice-find-one-filter.validate-contract';

export function validateLegalNoticeFindOneFilter(
    contract: LegalNoticeFindOneFilterContract
): asserts contract is LegalNoticeFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.LEGAL_NOTICE.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
