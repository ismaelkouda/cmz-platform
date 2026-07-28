import { GenericRequiredError } from '@cmz/shared-domain';
import { TermsUseCreateContract } from '../contracts/terms-use-create.contract';
import { TermsUseCreateValidateContract } from '../contracts/terms-use-create.validate-contract';

export function validateTermsUseCreate(
    contract: TermsUseCreateContract
): asserts contract is TermsUseCreateValidateContract {
    if (!contract.version) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.CREATE.VERSION_REQUIRE'
        );
    }
    if (!contract.content) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.CREATE.CONTENT_REQUIRE'
        );
    }
}
