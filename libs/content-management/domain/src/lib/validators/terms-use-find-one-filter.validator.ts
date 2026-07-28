import { GenericRequiredError } from '@cmz/shared-domain';
import { TermsUseFindOneFilterContract } from '../contracts/terms-use-find-one-filter.contract';
import { TermsUseFindOneFilterValidateContract } from '../contracts/terms-use-find-one-filter.validate-contract';

export function validateTermsUseFindOneFilter(
    contract: TermsUseFindOneFilterContract
): asserts contract is TermsUseFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
