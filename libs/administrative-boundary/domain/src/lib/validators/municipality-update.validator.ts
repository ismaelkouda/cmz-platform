import { GenericRequiredError } from '@cmz/shared-domain';
import { MunicipalityUpdateContract } from '../contracts/municipality-update.contract';
import { MunicipalityUpdateValidateContract } from '../contracts/municipality-update.validate-contract';

export function validateMunicipalityUpdate(
    contract: MunicipalityUpdateContract
): asserts contract is MunicipalityUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.code) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.UPDATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (
        contract.populationSize === undefined ||
        contract.populationSize === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.UPDATE.POPULATION_SIZE_REQUIRE'
        );
    }
    if (
        contract.infrastructureCount === undefined ||
        contract.infrastructureCount === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.UPDATE.INFRASTRUCTURE_COUNT_REQUIRE'
        );
    }
    if (!contract.regionId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.UPDATE.REGION_ID_REQUIRE'
        );
    }
    if (!contract.departmentId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.UPDATE.DEPARTMENT_ID_REQUIRE'
        );
    }
}
