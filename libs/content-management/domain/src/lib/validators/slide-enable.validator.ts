import { GenericRequiredError } from '@cmz/shared-domain';
import { SlideEnableContract } from '../contracts/slide-enable.contract';
import { SlideEnableValidateContract } from '../contracts/slide-enable.validate-contract';

export function validateSlideEnable(
    contract: SlideEnableContract
): asserts contract is SlideEnableValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.ENABLE.UNIQ_ID_REQUIRE'
        );
    }
}
