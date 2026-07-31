import { inject, Service } from '@angular/core';
import {
    TasksActionsCreateValidateContract,
    TasksActionsDeleteValidateContract,
    TasksActionsUpdateValidateContract,
} from '@cmz/processing-domain';
import {
    TasksActionsCreateApiDto,
    TasksActionsDeleteApiDto,
    TasksActionsUpdateApiDto,
} from '../dtos/tasks-actions-api.dto';
import { TasksActionsConformityMapper } from './tasks-actions-conformity.mapper';
import { mapTasksActionsStoreDto } from './tasks-actions-store.mapper';

@Service()
export class TasksActionsMutationMapper {
    private readonly conformityMapper = inject(TasksActionsConformityMapper);

    toCreateDto(
        contract: TasksActionsCreateValidateContract
    ): TasksActionsCreateApiDto {
        return mapTasksActionsStoreDto(contract, this.conformityMapper);
    }

    toUpdateDto(
        contract: TasksActionsUpdateValidateContract
    ): TasksActionsUpdateApiDto {
        return {
            uniq_id: contract.uniqId,
            ...mapTasksActionsStoreDto(contract, this.conformityMapper),
        };
    }

    toDeleteDto(
        contract: TasksActionsDeleteValidateContract
    ): TasksActionsDeleteApiDto {
        return { uniq_id: contract.uniqId };
    }
}
