import { TermsUsePublishContract } from '../contracts/terms-use-publish.contract';
import { TermsUsePublishValidateContract } from '../contracts/terms-use-publish.validate-contract';
import { validateTermsUsePublish } from '../validators/terms-use-publish.validator';

export function termsUsePublishVo(
    contract: TermsUsePublishContract
): TermsUsePublishValidateContract {
    validateTermsUsePublish(contract);
    return contract;
}
