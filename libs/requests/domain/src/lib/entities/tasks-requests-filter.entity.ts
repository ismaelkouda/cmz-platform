import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { TasksRequestsFilterContract } from '../contracts/tasks-requests-filter.contract';

export function tasksRequestsFilterEntity(
    contract: TasksRequestsFilterContract
): TasksRequestsFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
