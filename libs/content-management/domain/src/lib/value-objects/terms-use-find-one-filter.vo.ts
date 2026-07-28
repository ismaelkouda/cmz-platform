import { TermsUseFindOneFilterContract } from '../contracts/terms-use-find-one-filter.contract';
import { TermsUseFindOneFilterValidateContract } from '../contracts/terms-use-find-one-filter.validate-contract';
import { validateTermsUseFindOneFilter } from '../validators/terms-use-find-one-filter.validator';

export function termsUseFindOneFilterVo(
    contract: TermsUseFindOneFilterContract
): TermsUseFindOneFilterValidateContract {
    validateTermsUseFindOneFilter(contract);
    return contract;
}
