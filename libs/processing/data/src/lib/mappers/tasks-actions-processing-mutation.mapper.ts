import { inject, Service } from '@angular/core';
import {
    TasksActionsProcessingCreateValidateContract,
    TasksActionsProcessingDeleteValidateContract,
    TasksActionsProcessingUpdateValidateContract,
} from '@cmz/processing-domain';
import {
    TasksActionsCreateApiDto,
    TasksActionsDeleteApiDto,
    TasksActionsUpdateApiDto,
} from '../dtos/tasks-actions-processing-api.dto';
import { TasksActionsProcessingConformityMapper } from './tasks-actions-processing-conformity.mapper';
import { mapTasksActionsStoreDto } from './tasks-actions-processing-store.mapper';

@Service()
export class TasksActionsProcessingMutationMapper {
    private readonly conformityMapper = inject(
        TasksActionsProcessingConformityMapper
    );

    toCreateDto(
        contract: TasksActionsProcessingCreateValidateContract
    ): TasksActionsCreateApiDto {
        return mapTasksActionsStoreDto(contract, this.conformityMapper);
    }

    toUpdateDto(
        contract: TasksActionsProcessingUpdateValidateContract
    ): TasksActionsUpdateApiDto {
        return {
            uniq_id: contract.uniqId,
            ...mapTasksActionsStoreDto(contract, this.conformityMapper),
        };
    }

    toDeleteDto(
        contract: TasksActionsProcessingDeleteValidateContract
    ): TasksActionsDeleteApiDto {
        return { uniq_id: contract.uniqId };
    }
}
