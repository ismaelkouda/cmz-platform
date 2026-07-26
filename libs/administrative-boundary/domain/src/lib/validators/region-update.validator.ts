import { GenericRequiredError } from '@cmz/shared-domain';
import { RegionUpdateContract } from '../contracts/region-update.contract';
import { RegionUpdateValidateContract } from '../contracts/region-update.validate-contract';

export function validateRegionUpdate(
    contract: RegionUpdateContract
): asserts contract is RegionUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.code) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.UPDATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (
        contract.populationSize === undefined ||
        contract.populationSize === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.UPDATE.POPULATION_SIZE_REQUIRE'
        );
    }
    if (
        contract.infrastructureCount === undefined ||
        contract.infrastructureCount === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.UPDATE.INFRASTRUCTURE_COUNT_REQUIRE'
        );
    }
}
