import { GenericRequiredError } from '@cmz/shared-domain';
import { TermsUseUnpublishContract } from '../contracts/terms-use-unpublish.contract';
import { TermsUseUnpublishValidateContract } from '../contracts/terms-use-unpublish.validate-contract';

export function validateTermsUseUnpublish(
    contract: TermsUseUnpublishContract
): asserts contract is TermsUseUnpublishValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.UNPUBLISH.UNIQ_ID_REQUIRE'
        );
    }
}
