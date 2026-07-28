import { GenericRequiredError } from '@cmz/shared-domain';
import { HomeFindOneFilterContract } from '../contracts/home-find-one-filter.contract';
import { HomeFindOneFilterValidateContract } from '../contracts/home-find-one-filter.validate-contract';

export function validateHomeFindOneFilter(
    contract: HomeFindOneFilterContract
): asserts contract is HomeFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'CONTENT_MANAGEMENT.HOME.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
