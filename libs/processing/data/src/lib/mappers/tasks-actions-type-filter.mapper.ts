import { TasksActionsTypeFilterValidateContract } from '@cmz/processing-domain';
import { TasksActionsTypeFilterApiDto } from '../dtos/tasks-actions-api.dto';

export function tasksActionsTypeFilterMapper(
    contract: TasksActionsTypeFilterValidateContract
): TasksActionsTypeFilterApiDto {
    return { id: contract.reportUniqId };
}
