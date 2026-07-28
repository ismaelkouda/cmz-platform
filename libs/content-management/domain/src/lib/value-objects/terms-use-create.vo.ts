import { TermsUseCreateContract } from '../contracts/terms-use-create.contract';
import { TermsUseCreateValidateContract } from '../contracts/terms-use-create.validate-contract';
import { validateTermsUseCreate } from '../validators/terms-use-create.validator';

export function termsUseCreateVo(
    contract: TermsUseCreateContract
): TermsUseCreateValidateContract {
    validateTermsUseCreate(contract);
    return contract;
}
