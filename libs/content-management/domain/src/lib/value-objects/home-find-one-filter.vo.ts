import { HomeFindOneFilterContract } from '../contracts/home-find-one-filter.contract';
import { HomeFindOneFilterValidateContract } from '../contracts/home-find-one-filter.validate-contract';
import { validateHomeFindOneFilter } from '../validators/home-find-one-filter.validator';

export function homeFindOneFilterVo(
    contract: HomeFindOneFilterContract
): HomeFindOneFilterValidateContract {
    validateHomeFindOneFilter(contract);
    return contract;
}
