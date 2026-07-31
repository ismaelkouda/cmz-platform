import { Service } from '@angular/core';
import { TasksActionsConformity } from '@cmz/processing-domain';
import { TasksActionsConformityApiDto } from '../dtos/tasks-actions-api.dto';

@Service()
export class TasksActionsConformityMapper {
    mapFromDto(dto: TasksActionsConformityApiDto): TasksActionsConformity {
        const map: Record<
            TasksActionsConformityApiDto,
            TasksActionsConformity
        > = {
            conform: TasksActionsConformity.CONFORM,
            'non-conform': TasksActionsConformity.NON_CONFORM,
            'in-progress': TasksActionsConformity.IN_PROGRESS,
            unknown: TasksActionsConformity.UNKNOWN,
        };
        return map[dto] ?? TasksActionsConformity.UNKNOWN;
    }

    mapToDto(value: TasksActionsConformity): TasksActionsConformityApiDto {
        const map: Record<
            TasksActionsConformity,
            TasksActionsConformityApiDto
        > = {
            [TasksActionsConformity.CONFORM]: 'conform',
            [TasksActionsConformity.NON_CONFORM]: 'non-conform',
            [TasksActionsConformity.IN_PROGRESS]: 'in-progress',
            [TasksActionsConformity.UNKNOWN]: 'unknown',
        };
        return map[value];
    }
}
