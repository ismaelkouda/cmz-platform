import { SlideFindOneFilterContract } from '../contracts/slide-find-one-filter.contract';
import { SlideFindOneFilterValidateContract } from '../contracts/slide-find-one-filter.validate-contract';
import { validateSlideFindOneFilter } from '../validators/slide-find-one-filter.validator';

export function slideFindOneFilterVo(
    contract: SlideFindOneFilterContract
): SlideFindOneFilterValidateContract {
    validateSlideFindOneFilter(contract);
    return contract;
}
