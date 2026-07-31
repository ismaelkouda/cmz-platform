import { assertValidDateRange } from '@cmz/shared-domain';
import { TasksProcessingFilterContract } from '../contracts/tasks-processing-filter.contract';

export function validateTasksProcessingFilter(
    contract: TasksProcessingFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
