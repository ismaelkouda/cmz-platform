import { GenericRequiredError } from '@cmz/shared-domain';
import { TermsUseDeleteContract } from '../contracts/terms-use-delete.contract';
import { TermsUseDeleteValidateContract } from '../contracts/terms-use-delete.validate-contract';

export function validateTermsUseDelete(
    contract: TermsUseDeleteContract
): asserts contract is TermsUseDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
