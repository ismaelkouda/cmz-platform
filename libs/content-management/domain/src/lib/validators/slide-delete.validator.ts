import { GenericRequiredError } from '@cmz/shared-domain';
import { SlideDeleteContract } from '../contracts/slide-delete.contract';
import { SlideDeleteValidateContract } from '../contracts/slide-delete.validate-contract';

export function validateSlideDelete(
    contract: SlideDeleteContract
): asserts contract is SlideDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
