import { RegionFindOneFilterContract } from '../contracts/region-find-one-filter.contract';
import { RegionFindOneFilterValidateContract } from '../contracts/region-find-one-filter.validate-contract';
import { validateRegionFindOneFilter } from '../validators/region-find-one-filter.validator';

export function regionFindOneFilterVo(
    contract: RegionFindOneFilterContract
): RegionFindOneFilterValidateContract {
    validateRegionFindOneFilter(contract);
    return contract;
}
