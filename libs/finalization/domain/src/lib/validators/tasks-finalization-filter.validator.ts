import { assertValidDateRange } from '@cmz/shared-domain';
import { TasksFinalizationFilterContract } from '../contracts/tasks-finalization-filter.contract';

export function validateTasksFinalizationFilter(
    contract: TasksFinalizationFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
