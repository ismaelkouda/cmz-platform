import { GenericRequiredError } from '@cmz/shared-domain';
import { RegionCreateContract } from '../contracts/region-create.contract';
import { RegionCreateValidateContract } from '../contracts/region-create.validate-contract';

/**
 * `populationSize`/`infrastructureCount` peuvent légitimement valoir `0` —
 * vérifier `=== undefined || === null`, jamais `!contract.champ` (0 est
 * falsy).
 */
export function validateRegionCreate(
    contract: RegionCreateContract
): asserts contract is RegionCreateValidateContract {
    if (!contract.code) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.CREATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (
        contract.populationSize === undefined ||
        contract.populationSize === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.CREATE.POPULATION_SIZE_REQUIRE'
        );
    }
    if (
        contract.infrastructureCount === undefined ||
        contract.infrastructureCount === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.REGION.FORM.ERROR.CREATE.INFRASTRUCTURE_COUNT_REQUIRE'
        );
    }
}
