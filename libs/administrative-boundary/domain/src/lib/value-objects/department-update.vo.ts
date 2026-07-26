import { DepartmentUpdateContract } from '../contracts/department-update.contract';
import { DepartmentUpdateValidateContract } from '../contracts/department-update.validate-contract';
import { validateDepartmentUpdate } from '../validators/department-update.validator';

export function departmentUpdateVo(
    contract: DepartmentUpdateContract
): DepartmentUpdateValidateContract {
    validateDepartmentUpdate(contract);
    return {
        uniqId: contract.uniqId,
        code: contract.code,
        name: contract.name,
        description: contract.description,
        populationSize: contract.populationSize,
        infrastructureCount: contract.infrastructureCount,
        regionId: contract.regionId,
    };
}
