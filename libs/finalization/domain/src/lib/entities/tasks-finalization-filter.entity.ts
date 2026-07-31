import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { TasksFinalizationFilterContract } from '../contracts/tasks-finalization-filter.contract';

export function tasksFinalizationFilterEntity(
    contract: TasksFinalizationFilterContract
): TasksFinalizationFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
