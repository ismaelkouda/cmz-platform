import { RegionFilterContract } from '../contracts/region-filter.contract';
import { validateRegionFilter } from '../validators/region-filter.validator';

export function regionFilterVo(
    contract: RegionFilterContract
): RegionFilterContract {
    validateRegionFilter(contract);
    return contract;
}
