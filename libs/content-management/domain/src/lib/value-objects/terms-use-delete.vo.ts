import { TermsUseDeleteContract } from '../contracts/terms-use-delete.contract';
import { TermsUseDeleteValidateContract } from '../contracts/terms-use-delete.validate-contract';
import { validateTermsUseDelete } from '../validators/terms-use-delete.validator';

export function termsUseDeleteVo(
    contract: TermsUseDeleteContract
): TermsUseDeleteValidateContract {
    validateTermsUseDelete(contract);
    return contract;
}
