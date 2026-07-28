import { SlideDisableContract } from '../contracts/slide-disable.contract';
import { SlideDisableValidateContract } from '../contracts/slide-disable.validate-contract';
import { validateSlideDisable } from '../validators/slide-disable.validator';

export function slideDisableVo(
    contract: SlideDisableContract
): SlideDisableValidateContract {
    validateSlideDisable(contract);
    return contract;
}
