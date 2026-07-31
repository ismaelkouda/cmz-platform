import {
    TasksActionsCreateContract,
    TasksActionsCreateValidateContract,
    TasksActionsDeleteContract,
    TasksActionsDeleteValidateContract,
    TasksActionsFilterContract,
    TasksActionsFilterValidateContract,
    TasksActionsTypeFilterContract,
    TasksActionsTypeFilterValidateContract,
    TasksActionsUpdateContract,
    TasksActionsUpdateValidateContract,
} from '../contracts/tasks-actions.contract';
import {
    validateTasksActionsCreate,
    validateTasksActionsDelete,
    validateTasksActionsFilter,
    validateTasksActionsTypeFilter,
    validateTasksActionsUpdate,
} from '../validators/tasks-actions.validator';

export function tasksActionsFilterVo(
    contract: TasksActionsFilterContract
): TasksActionsFilterValidateContract {
    validateTasksActionsFilter(contract);
    return { reportUniqId: contract.reportUniqId };
}

export function tasksActionsCreateVo(
    contract: TasksActionsCreateContract
): TasksActionsCreateValidateContract {
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

export function tasksActionsUpdateVo(
    contract: TasksActionsUpdateContract
): TasksActionsUpdateValidateContract {
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

export function tasksActionsDeleteVo(
    contract: TasksActionsDeleteContract
): TasksActionsDeleteValidateContract {
    validateTasksActionsDelete(contract);
    return { uniqId: contract.uniqId };
}

export function tasksActionsTypeFilterVo(
    contract: TasksActionsTypeFilterContract
): TasksActionsTypeFilterValidateContract {
    validateTasksActionsTypeFilter(contract);
    return { reportUniqId: contract.reportUniqId };
}
