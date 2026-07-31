import { Service } from '@angular/core';
import { TasksActionsProcessingConformity } from '@cmz/processing-domain';
import { TasksActionsProcessingConformityApiDto } from '../dtos/tasks-actions-processing-api.dto';

@Service()
export class TasksActionsProcessingConformityMapper {
    mapFromDto(
        dto: TasksActionsProcessingConformityApiDto
    ): TasksActionsProcessingConformity {
        const map: Record<
            TasksActionsProcessingConformityApiDto,
            TasksActionsProcessingConformity
        > = {
            conform: TasksActionsProcessingConformity.CONFORM,
            'non-conform': TasksActionsProcessingConformity.NON_CONFORM,
            'in-progress': TasksActionsProcessingConformity.IN_PROGRESS,
            unknown: TasksActionsProcessingConformity.UNKNOWN,
        };
        return map[dto] ?? TasksActionsProcessingConformity.UNKNOWN;
    }

    mapToDto(
        value: TasksActionsProcessingConformity
    ): TasksActionsProcessingConformityApiDto {
        const map: Record<
            TasksActionsProcessingConformity,
            TasksActionsProcessingConformityApiDto
        > = {
            [TasksActionsProcessingConformity.CONFORM]: 'conform',
            [TasksActionsProcessingConformity.NON_CONFORM]: 'non-conform',
            [TasksActionsProcessingConformity.IN_PROGRESS]: 'in-progress',
            [TasksActionsProcessingConformity.UNKNOWN]: 'unknown',
        };
        return map[value];
    }
}
