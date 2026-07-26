import { GenericRequiredError } from '@cmz/shared-domain';
import { DepartmentFindOneFilterContract } from '../contracts/department-find-one-filter.contract';
import { DepartmentFindOneFilterValidateContract } from '../contracts/department-find-one-filter.validate-contract';

export function validateDepartmentFindOneFilter(
    contract: DepartmentFindOneFilterContract
): asserts contract is DepartmentFindOneFilterValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(
            'ADMINISTRATIVE_BOUNDARY.DEPARTMENT.FORM.ERROR.FIND_ONE.UNIQ_ID_REQUIRE'
        );
    }
}
