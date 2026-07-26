import { assertValidDateRange } from '@cmz/shared-domain';
import { DepartmentFilterContract } from '../contracts/department-filter.contract';

export function validateDepartmentFilter(
    contract: DepartmentFilterContract
): void {
    assertValidDateRange(contract?.startDate, contract?.endDate);
}
