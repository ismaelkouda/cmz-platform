import { SlideFilterContract } from '../contracts/slide-filter.contract';
import { validateSlideFilter } from '../validators/slide-filter.validator';

export function slideFilterVo(
    contract: SlideFilterContract
): SlideFilterContract {
    validateSlideFilter(contract);
    return contract;
}
