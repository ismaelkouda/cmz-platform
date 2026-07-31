import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { TasksProcessingFilterContract } from '../contracts/tasks-processing-filter.contract';

export function tasksProcessingFilterEntity(
    contract: TasksProcessingFilterContract
): TasksProcessingFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
