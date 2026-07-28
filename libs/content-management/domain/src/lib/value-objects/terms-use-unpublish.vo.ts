import { TermsUseUnpublishContract } from '../contracts/terms-use-unpublish.contract';
import { TermsUseUnpublishValidateContract } from '../contracts/terms-use-unpublish.validate-contract';
import { validateTermsUseUnpublish } from '../validators/terms-use-unpublish.validator';

export function termsUseUnpublishVo(
    contract: TermsUseUnpublishContract
): TermsUseUnpublishValidateContract {
    validateTermsUseUnpublish(contract);
    return contract;
}
