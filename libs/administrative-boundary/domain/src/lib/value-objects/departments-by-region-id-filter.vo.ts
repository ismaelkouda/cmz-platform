import { DepartmentsByRegionIdFilterContract } from '../contracts/departments-by-region-id-filter.contract';
import { DepartmentsByRegionIdFilterValidateContract } from '../contracts/departments-by-region-id-filter.validate-contract';
import { validateDepartmentsByRegionIdFilter } from '../validators/departments-by-region-id-filter.validator';

export function departmentsByRegionIdFilterVo(
    contract: DepartmentsByRegionIdFilterContract
): DepartmentsByRegionIdFilterValidateContract {
    validateDepartmentsByRegionIdFilter(contract);
    return contract as DepartmentsByRegionIdFilterValidateContract;
}
