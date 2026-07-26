import { GenericRequiredError } from '@cmz/shared-domain';
import { DepartmentCreateContract } from '../contracts/department-create.contract';
import { DepartmentCreateValidateContract } from '../contracts/department-create.validate-contract';

export function validateDepartmentCreate(
    contract: DepartmentCreateContract
): asserts contract is DepartmentCreateValidateContract {
    if (!contract.code) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.CREATE.CODE_REQUIRE'
        );
    }
    if (!contract.name) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.CREATE.NAME_REQUIRE'
        );
    }
    if (
        contract.populationSize === undefined ||
        contract.populationSize === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.CREATE.POPULATION_SIZE_REQUIRE'
        );
    }
    if (
        contract.infrastructureCount === undefined ||
        contract.infrastructureCount === null
    ) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.CREATE.INFRASTRUCTURE_COUNT_REQUIRE'
        );
    }
    if (!contract.regionId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.CREATE.REGION_ID_REQUIRE'
        );
    }
}
