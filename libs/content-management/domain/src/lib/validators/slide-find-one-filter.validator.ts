import { GenericRequiredError } from '@cmz/shared-domain';
import { SlideFindOneFilterContract } from '../contracts/slide-find-one-filter.contract';
import { SlideFindOneFilterValidateContract } from '../contracts/slide-find-one-filter.validate-contract';

export function validateSlideFindOneFilter(
    contract: SlideFindOneFilterContract
): asserts contract is SlideFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.SLIDE.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
