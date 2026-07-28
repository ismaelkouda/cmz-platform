import { TermsUseUpdateContract } from '../contracts/terms-use-update.contract';
import { TermsUseUpdateValidateContract } from '../contracts/terms-use-update.validate-contract';
import { validateTermsUseUpdate } from '../validators/terms-use-update.validator';

export function termsUseUpdateVo(
    contract: TermsUseUpdateContract
): TermsUseUpdateValidateContract {
    validateTermsUseUpdate(contract);
    return contract;
}
