import { normalizePhoneNumber } from '@cmz/shared-domain';
import { TasksRequestsFilterContract } from '../contracts/tasks-requests-filter.contract';
import { validateTasksRequestsFilter } from '../validators/tasks-requests-filter.validator';

export function tasksRequestsFilterVo(
    contract: TasksRequestsFilterContract
): TasksRequestsFilterContract {
    const resolved: TasksRequestsFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateTasksRequestsFilter(resolved);
    return resolved;
}
