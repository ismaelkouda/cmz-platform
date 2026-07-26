import { GenericRequiredError } from '@cmz/shared-domain';
import { RegionFindOneFilterContract } from '../contracts/region-find-one-filter.contract';
import { RegionFindOneFilterValidateContract } from '../contracts/region-find-one-filter.validate-contract';

export function validateRegionFindOneFilter(
    contract: RegionFindOneFilterContract
): asserts contract is RegionFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
