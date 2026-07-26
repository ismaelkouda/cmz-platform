import { DepartmentFilterContract } from '../contracts/department-filter.contract';
import { validateDepartmentFilter } from '../validators/department-filter.validator';

export function departmentFilterVo(
    contract: DepartmentFilterContract
): DepartmentFilterContract {
    validateDepartmentFilter(contract);
    return contract;
}
