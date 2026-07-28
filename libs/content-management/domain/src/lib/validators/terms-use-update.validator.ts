import { GenericRequiredError } from '@cmz/shared-domain';
import { TermsUseUpdateContract } from '../contracts/terms-use-update.contract';
import { TermsUseUpdateValidateContract } from '../contracts/terms-use-update.validate-contract';

export function validateTermsUseUpdate(
    contract: TermsUseUpdateContract
): asserts contract is TermsUseUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.version) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.UPDATE.VERSION_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.UPDATE.CONTENT_REQUIRE'
        );
    }
}
