import { TasksActionsFilterValidateContract } from '@cmz/processing-domain';
import { TasksActionsFilterApiDto } from '../dtos/tasks-actions-api.dto';

export function tasksActionsFilterMapper(
    contract: TasksActionsFilterValidateContract
): TasksActionsFilterApiDto {
    return { report_uniq_id: contract.reportUniqId };
}
