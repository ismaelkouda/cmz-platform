import { GenericRequiredError } from '@cmz/shared-domain';
import { MunicipalityCreateContract } from '../contracts/municipality-create.contract';
import { MunicipalityCreateValidateContract } from '../contracts/municipality-create.validate-contract';

export function validateMunicipalityCreate(
    contract: MunicipalityCreateContract
): asserts contract is MunicipalityCreateValidateContract {
    if (!contract.code) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.CREATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (
        contract.populationSize === undefined ||
        contract.populationSize === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.CREATE.POPULATION_SIZE_REQUIRE'
        );
    }
    if (
        contract.infrastructureCount === undefined ||
        contract.infrastructureCount === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.CREATE.INFRASTRUCTURE_COUNT_REQUIRE'
        );
    }
    if (!contract.regionId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.CREATE.REGION_ID_REQUIRE'
        );
    }
    if (!contract.departmentId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.CREATE.DEPARTMENT_ID_REQUIRE'
        );
    }
}
