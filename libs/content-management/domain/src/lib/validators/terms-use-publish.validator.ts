import { GenericRequiredError } from '@cmz/shared-domain';
import { TermsUsePublishContract } from '../contracts/terms-use-publish.contract';
import { TermsUsePublishValidateContract } from '../contracts/terms-use-publish.validate-contract';

export function validateTermsUsePublish(
    contract: TermsUsePublishContract
): asserts contract is TermsUsePublishValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.TERMS_USE.FORM.ERROR.PUBLISH.UNIQ_ID_REQUIRE'
        );
    }
}
