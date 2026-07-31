import { normalizePhoneNumber } from '@cmz/shared-domain';
import { TasksFinalizationFilterContract } from '../contracts/tasks-finalization-filter.contract';
import { validateTasksFinalizationFilter } from '../validators/tasks-finalization-filter.validator';

export function tasksFinalizationFilterVo(
    contract: TasksFinalizationFilterContract
): TasksFinalizationFilterContract {
    const resolved: TasksFinalizationFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateTasksFinalizationFilter(resolved);
    return resolved;
}
