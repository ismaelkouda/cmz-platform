import { SlideDeleteContract } from '../contracts/slide-delete.contract';
import { SlideDeleteValidateContract } from '../contracts/slide-delete.validate-contract';
import { validateSlideDelete } from '../validators/slide-delete.validator';

export function slideDeleteVo(
    contract: SlideDeleteContract
): SlideDeleteValidateContract {
    validateSlideDelete(contract);
    return contract;
}
