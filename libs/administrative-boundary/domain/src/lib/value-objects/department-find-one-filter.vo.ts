import { DepartmentFindOneFilterContract } from '../contracts/department-find-one-filter.contract';
import { DepartmentFindOneFilterValidateContract } from '../contracts/department-find-one-filter.validate-contract';
import { validateDepartmentFindOneFilter } from '../validators/department-find-one-filter.validator';

export function departmentFindOneFilterVo(
    contract: DepartmentFindOneFilterContract
): DepartmentFindOneFilterValidateContract {
    validateDepartmentFindOneFilter(contract);
    return contract as DepartmentFindOneFilterValidateContract;
}
