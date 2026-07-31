import { assertValidDateRange } from '@cmz/shared-domain';
import { TasksRequestsFilterContract } from '../contracts/tasks-requests-filter.contract';

export function validateTasksRequestsFilter(
    contract: TasksRequestsFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
