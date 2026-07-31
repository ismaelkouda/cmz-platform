import { normalizePhoneNumber } from '@cmz/shared-domain';
import { TasksProcessingFilterContract } from '../contracts/tasks-processing-filter.contract';
import { validateTasksProcessingFilter } from '../validators/tasks-processing-filter.validator';

export function tasksProcessingFilterVo(
    contract: TasksProcessingFilterContract
): TasksProcessingFilterContract {
    const resolved: TasksProcessingFilterContract = {
        ...contract,
        initiatorPhoneNumber: normalizePhoneNumber(
            contract.initiatorPhoneNumber?.trim()
        ),
        uniqId: contract.uniqId?.trim() || undefined,
        source: contract.source?.trim() || undefined,
    };
    validateTasksProcessingFilter(resolved);
    return resolved;
}
