import { TasksActionsTypeProcessingFilterValidateContract } from '@cmz/processing-domain';
import { TasksActionsTypeFilterApiDto } from '../dtos/tasks-actions-processing-api.dto';

export function tasksActionsTypeFilterMapper(
    contract: TasksActionsTypeProcessingFilterValidateContract
): TasksActionsTypeFilterApiDto {
    return { id: contract.reportUniqId };
}
