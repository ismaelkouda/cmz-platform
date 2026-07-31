import { TasksActionsProcessingFilterValidateContract } from '@cmz/processing-domain';
import { TasksActionsFilterApiDto } from '../dtos/tasks-actions-processing-api.dto';

export function tasksActionsFilterMapper(
    contract: TasksActionsProcessingFilterValidateContract
): TasksActionsFilterApiDto {
    return { report_uniq_id: contract.reportUniqId };
}
