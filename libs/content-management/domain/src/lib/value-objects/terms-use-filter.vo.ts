import { TermsUseFilterContract } from '../contracts/terms-use-filter.contract';
import { validateTermsUseFilter } from '../validators/terms-use-filter.validator';

export function termsUseFilterVo(
    contract: TermsUseFilterContract
): TermsUseFilterContract {
    validateTermsUseFilter(contract);
    return contract;
}
