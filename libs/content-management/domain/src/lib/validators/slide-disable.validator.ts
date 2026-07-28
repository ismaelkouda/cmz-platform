import { GenericRequiredError } from '@cmz/shared-domain';
import { SlideDisableContract } from '../contracts/slide-disable.contract';
import { SlideDisableValidateContract } from '../contracts/slide-disable.validate-contract';

export function validateSlideDisable(
    contract: SlideDisableContract
): asserts contract is SlideDisableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.DISABLE.UNIQ_ID_REQUIRE'
        );
    }
}
