import { GenericRequiredError } from '@cmz/shared-domain';
import { DepartmentUpdateContract } from '../contracts/department-update.contract';
import { DepartmentUpdateValidateContract } from '../contracts/department-update.validate-contract';

export function validateDepartmentUpdate(
    contract: DepartmentUpdateContract
): asserts contract is DepartmentUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.UPDATE.UNIQ_ID_REQUIRE'
        );
    }
    if (!contract.code) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.UPDATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.UPDATE.NAME_REQUIRE'
        );
    }
    if (
        contract.populationSize === undefined ||
        contract.populationSize === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.UPDATE.POPULATION_SIZE_REQUIRE'
        );
    }
    if (
        contract.infrastructureCount === undefined ||
        contract.infrastructureCount === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.UPDATE.INFRASTRUCTURE_COUNT_REQUIRE'
        );
    }
    if (!contract.regionId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.UPDATE.REGION_ID_REQUIRE'
        );
    }
}
