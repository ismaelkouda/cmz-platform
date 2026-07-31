import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { MessageResultMapper } from '@cmz/shared-data';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    TasksActionsProcessingCreateValidateContract,
    TasksActionsProcessingDeleteValidateContract,
    TasksActionsProcessingEntity,
    TasksActionsProcessingFilterValidateContract,
    TasksActionsProcessingRepository,
    TasksActionsProcessingUpdateValidateContract,
} from '@cmz/processing-domain';
import { tasksActionsFilterMapper } from '../mappers/tasks-actions-processing-filter.mapper';
import { TasksActionsProcessingItemMapper } from '../mappers/tasks-actions-processing-item.mapper';
import { TasksActionsProcessingMutationMapper } from '../mappers/tasks-actions-processing-mutation.mapper';
import { TasksActionsProcessingApi } from '../sources/tasks-actions-processing.api';

@Service()
export class TasksActionsProcessingRepositoryImpl implements TasksActionsProcessingRepository {
    private readonly api = inject(TasksActionsProcessingApi);
    private readonly mapper = inject(TasksActionsProcessingItemMapper);
    private readonly mutationMapper = inject(
        TasksActionsProcessingMutationMapper
    );
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        validContract: TasksActionsProcessingFilterValidateContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksActionsProcessingEntity>> {
        return this.api
            .execute(tasksActionsFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: TasksActionsProcessingCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(this.mutationMapper.toCreateDto(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: TasksActionsProcessingUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(this.mutationMapper.toUpdateDto(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: TasksActionsProcessingDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(this.mutationMapper.toDeleteDto(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
