import { DepartmentCreateContract } from '../contracts/department-create.contract';
import { DepartmentCreateValidateContract } from '../contracts/department-create.validate-contract';
import { validateDepartmentCreate } from '../validators/department-create.validator';

export function departmentCreateVo(
    contract: DepartmentCreateContract
): DepartmentCreateValidateContract {
    validateDepartmentCreate(contract);
    return {
        code: contract.code,
        name: contract.name,
        description: contract.description,
        populationSize: contract.populationSize,
        infrastructureCount: contract.infrastructureCount,
        regionId: contract.regionId,
    };
}
