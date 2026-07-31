import { inject, Service } from '@angular/core';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { TelecomOperatorMapper } from '@cmz/shared-data';
import { TasksActionsProcessingEntity } from '@cmz/processing-domain';
import type { TasksActionsProcessingProps } from '@cmz/processing-domain';
import { TasksActionsItemApiDto } from '../dtos/tasks-actions-processing-api.dto';
import { TasksActionsProcessingConformityMapper } from './tasks-actions-processing-conformity.mapper';

@Service()
export class TasksActionsProcessingItemMapper extends PaginatedMapper<
    TasksActionsProcessingEntity,
    TasksActionsItemApiDto
> {
    private readonly telecomOperatorMapper = inject(TelecomOperatorMapper);
    private readonly conformityMapper = inject(
        TasksActionsProcessingConformityMapper
    );
    private readonly entityCache = new Map<
        string,
        TasksActionsProcessingEntity
    >();

    protected override mapItemFromDto(
        dto: TasksActionsItemApiDto
    ): TasksActionsProcessingEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: TasksActionsProcessingProps = {
            uniqId: dto.id,
            date: dto.date ? new Date(dto.date) : new Date(),
            type: dto.type,
            code: dto.type_code,
            operators: [this.telecomOperatorMapper.mapFromDto(dto.operator)],
            description: dto.description,
            shouldNotifyUser: dto.should_notify_user ?? false,
            autoChecked: dto.auto_check,
            isConform: this.conformityMapper.mapFromDto(dto.result),
            createdBy: `${dto.created_by.last_name} ${dto.created_by.first_name}`,
            updatedBy: `${dto.updated_by.last_name} ${dto.updated_by.first_name}`,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new TasksActionsProcessingEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
