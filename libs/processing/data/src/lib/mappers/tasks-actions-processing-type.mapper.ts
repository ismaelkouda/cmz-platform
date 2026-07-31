import { inject, Service } from '@angular/core';
import { ArrayResponseMapper, TelecomOperatorMapper } from '@cmz/shared-data';
import { TasksActionsTypeProcessingEntity } from '@cmz/processing-domain';
import type { TasksActionsTypeProcessingProps } from '@cmz/processing-domain';
import { TasksActionsTypeItemApiDto } from '../dtos/tasks-actions-processing-api.dto';

@Service()
export class TasksActionsTypeProcessingMapper extends ArrayResponseMapper<
    TasksActionsTypeProcessingEntity,
    TasksActionsTypeItemApiDto
> {
    private readonly telecomOperatorMapper = inject(TelecomOperatorMapper);

    protected mapItemFromDto(
        dto: TasksActionsTypeItemApiDto
    ): TasksActionsTypeProcessingEntity {
        const props: TasksActionsTypeProcessingProps = {
            label: dto.name,
            value: dto.code,
            operators: (dto.operators ?? []).map((operator) =>
                this.telecomOperatorMapper.mapFromDto(operator)
            ),
        };
        return new TasksActionsTypeProcessingEntity(props);
    }
}
