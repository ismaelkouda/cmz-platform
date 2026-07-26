import { GenericRequiredError } from '@cmz/shared-domain';
import { RegionDeleteContract } from '../contracts/region-delete.contract';
import { RegionDeleteValidateContract } from '../contracts/region-delete.validate-contract';

export function validateRegionDelete(
    contract: RegionDeleteContract
): asserts contract is RegionDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
