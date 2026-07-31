import { inject, Service } from '@angular/core';
import { ArrayResponseMapper, TelecomOperatorMapper } from '@cmz/shared-data';
import { TasksActionsTypeEntity } from '@cmz/processing-domain';
import type { TasksActionsTypeProps } from '@cmz/processing-domain';
import { TasksActionsTypeItemApiDto } from '../dtos/tasks-actions-api.dto';

@Service()
export class TasksActionsTypeMapper extends ArrayResponseMapper<
    TasksActionsTypeEntity,
    TasksActionsTypeItemApiDto
> {
    private readonly telecomOperatorMapper = inject(TelecomOperatorMapper);

    protected mapItemFromDto(
        dto: TasksActionsTypeItemApiDto
    ): TasksActionsTypeEntity {
        const props: TasksActionsTypeProps = {
            label: dto.name,
            value: dto.code,
            operators: (dto.operators ?? []).map((operator) =>
                this.telecomOperatorMapper.mapFromDto(operator)
            ),
        };
        return new TasksActionsTypeEntity(props);
    }
}
