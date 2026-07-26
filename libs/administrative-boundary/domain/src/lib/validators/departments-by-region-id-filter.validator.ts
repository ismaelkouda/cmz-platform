import { assertValidDateRange, GenericRequiredError } from '@cmz/shared-domain';
import { DepartmentsByRegionIdFilterContract } from '../contracts/departments-by-region-id-filter.contract';
import { DepartmentsByRegionIdFilterValidateContract } from '../contracts/departments-by-region-id-filter.validate-contract';

export function validateDepartmentsByRegionIdFilter(
    contract: DepartmentsByRegionIdFilterContract
): asserts contract is DepartmentsByRegionIdFilterValidateContract {
    if (!contract.regionId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.FILTER.REGION_ID_REQUIRE'
        );
    }
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
