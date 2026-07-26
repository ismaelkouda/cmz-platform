import { GenericRequiredError } from '@cmz/shared-domain';
import { DepartmentDeleteContract } from '../contracts/department-delete.contract';
import { DepartmentDeleteValidateContract } from '../contracts/department-delete.validate-contract';

export function validateDepartmentDelete(
    contract: DepartmentDeleteContract
): asserts contract is DepartmentDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.DELETE.UNIQ_ID_REQUIRE'
        );
    }
}
