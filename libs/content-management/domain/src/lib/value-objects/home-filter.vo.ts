import { HomeFilterContract } from '../contracts/home-filter.contract';
import { validateHomeFilter } from '../validators/home-filter.validator';

export function homeFilterVo(contract: HomeFilterContract): HomeFilterContract {
    validateHomeFilter(contract);
    return contract;
}
