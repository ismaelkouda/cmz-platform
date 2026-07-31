import {
    TasksActionsProcessingCreateContract,
    TasksActionsProcessingCreateValidateContract,
    TasksActionsProcessingDeleteContract,
    TasksActionsProcessingDeleteValidateContract,
    TasksActionsProcessingFilterContract,
    TasksActionsProcessingFilterValidateContract,
    TasksActionsTypeProcessingFilterContract,
    TasksActionsTypeProcessingFilterValidateContract,
    TasksActionsProcessingUpdateContract,
    TasksActionsProcessingUpdateValidateContract,
} from '../contracts/tasks-actions-processing.contract';
import {
    validateTasksActionsCreate,
    validateTasksActionsDelete,
    validateTasksActionsFilter,
    validateTasksActionsTypeFilter,
    validateTasksActionsUpdate,
} from '../validators/tasks-actions-processing.validator';

export function tasksActionsProcessingFilterVo(
    contract: TasksActionsProcessingFilterContract
): TasksActionsProcessingFilterValidateContract {
    validateTasksActionsFilter(contract);
    return { reportUniqId: contract.reportUniqId };
}

export function tasksActionsProcessingCreateVo(
    contract: TasksActionsProcessingCreateContract
): TasksActionsProcessingCreateValidateContract {
    validateTasksActionsCreate(contract);
    return {
        reportUniqId: contract.reportUniqId,
        date: contract.date,
        type: contract.type,
        operator: contract.operator,
        description: contract.description,
        shouldNotifyUser: Boolean(contract.shouldNotifyUser),
        isConform: contract.isConform,
    };
}

export function tasksActionsProcessingUpdateVo(
    contract: TasksActionsProcessingUpdateContract
): TasksActionsProcessingUpdateValidateContract {
    validateTasksActionsUpdate(contract);
    return {
        uniqId: contract.uniqId,
        reportUniqId: contract.reportUniqId,
        date: contract.date,
        type: contract.type,
        operator: contract.operator,
        description: contract.description,
        shouldNotifyUser: Boolean(contract.shouldNotifyUser),
        isConform: contract.isConform,
    };
}

export function tasksActionsProcessingDeleteVo(
    contract: TasksActionsProcessingDeleteContract
): TasksActionsProcessingDeleteValidateContract {
    validateTasksActionsDelete(contract);
    return { uniqId: contract.uniqId };
}

export function tasksActionsTypeProcessingFilterVo(
    contract: TasksActionsTypeProcessingFilterContract
): TasksActionsTypeProcessingFilterValidateContract {
    validateTasksActionsTypeFilter(contract);
    return { reportUniqId: contract.reportUniqId };
}
