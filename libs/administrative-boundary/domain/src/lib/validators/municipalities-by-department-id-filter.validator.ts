import { assertValidDateRange, GenericRequiredError } from '@cmz/shared-domain';
import { MunicipalitiesByDepartmentIdFilterContract } from '../contracts/municipalities-by-department-id-filter.contract';
import { MunicipalitiesByDepartmentIdFilterValidateContract } from '../contracts/municipalities-by-department-id-filter.validate-contract';

export function validateMunicipalitiesByDepartmentIdFilter(
    contract: MunicipalitiesByDepartmentIdFilterContract
): asserts contract is MunicipalitiesByDepartmentIdFilterValidateContract {
    if (!contract.departmentId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.MUNICIPALITY.FORM.ERROR.FILTER.DEPARTMENT_ID_REQUIRE'
        );
    }
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
