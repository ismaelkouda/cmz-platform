import { DepartmentDeleteContract } from '../contracts/department-delete.contract';
import { DepartmentDeleteValidateContract } from '../contracts/department-delete.validate-contract';
import { validateDepartmentDelete } from '../validators/department-delete.validator';

export function departmentDeleteVo(
    contract: DepartmentDeleteContract
): DepartmentDeleteValidateContract {
    validateDepartmentDelete(contract);
    return contract as DepartmentDeleteValidateContract;
}
