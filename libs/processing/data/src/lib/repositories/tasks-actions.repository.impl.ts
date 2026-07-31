import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { MessageResultMapper } from '@cmz/shared-data';
import { FetchOptions, MessageEntity, PageResult } from '@cmz/shared-domain';
import {
    TasksActionsCreateValidateContract,
    TasksActionsDeleteValidateContract,
    TasksActionsEntity,
    TasksActionsFilterValidateContract,
    TasksActionsRepository,
    TasksActionsUpdateValidateContract,
} from '@cmz/processing-domain';
import { tasksActionsFilterMapper } from '../mappers/tasks-actions-filter.mapper';
import { TasksActionsItemMapper } from '../mappers/tasks-actions-item.mapper';
import { TasksActionsMutationMapper } from '../mappers/tasks-actions-mutation.mapper';
import { TasksActionsApi } from '../sources/tasks-actions.api';

@Service()
export class TasksActionsRepositoryImpl implements TasksActionsRepository {
    private readonly api = inject(TasksActionsApi);
    private readonly mapper = inject(TasksActionsItemMapper);
    private readonly mutationMapper = inject(TasksActionsMutationMapper);
    private readonly messageMapper = inject(MessageResultMapper);

    execute(
        validContract: TasksActionsFilterValidateContract,
        page: string,
        options?: FetchOptions
    ): Observable<PageResult<TasksActionsEntity>> {
        return this.api
            .execute(tasksActionsFilterMapper(validContract), page, options)
            .pipe(map((response) => this.mapper.mapFromDto(response)));
    }

    create(
        validContract: TasksActionsCreateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .create(this.mutationMapper.toCreateDto(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    update(
        validContract: TasksActionsUpdateValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .update(this.mutationMapper.toUpdateDto(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }

    delete(
        validContract: TasksActionsDeleteValidateContract
    ): Observable<MessageEntity> {
        return this.api
            .delete(this.mutationMapper.toDeleteDto(validContract))
            .pipe(
                map((response) => this.messageMapper.mapFromMessage(response))
            );
    }
}
