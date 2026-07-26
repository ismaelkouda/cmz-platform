import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { DepartmentFilterContract } from '../contracts/department-filter.contract';

export function departmentFilterEntity(
    contract: DepartmentFilterContract
): DepartmentFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
