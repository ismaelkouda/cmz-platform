import { SlideEnableContract } from '../contracts/slide-enable.contract';
import { SlideEnableValidateContract } from '../contracts/slide-enable.validate-contract';
import { validateSlideEnable } from '../validators/slide-enable.validator';

export function slideEnableVo(
    contract: SlideEnableContract
): SlideEnableValidateContract {
    validateSlideEnable(contract);
    return contract;
}
