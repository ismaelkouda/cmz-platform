import { GenericRequiredError } from '@cmz/shared-domain';
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

const E = 'PROCESSING.TASKS.ACTIONS.FORM.ERROR';

export function validateTasksActionsFilter(
    contract: TasksActionsFilterContract
): asserts contract is TasksActionsFilterValidateContract {
    if (!contract.reportUniqId) {
        throw new GenericRequiredError(`${E}.CREATE.REPORT_UNIQ_ID_REQUIRE`);
    }
}

export function validateTasksActionsCreate(
    contract: TasksActionsCreateContract
): asserts contract is TasksActionsCreateValidateContract {
    if (!contract.reportUniqId) {
        throw new GenericRequiredError(`${E}.CREATE.REPORT_UNIQ_ID_REQUIRE`);
    }
    if (!contract.date) {
        throw new GenericRequiredError(`${E}.CREATE.DATE_REQUIRE`);
    }
    if (!contract.type) {
        throw new GenericRequiredError(`${E}.CREATE.TYPE_REQUIRE`);
    }
    if (!contract.operator) {
        throw new GenericRequiredError(`${E}.CREATE.OPERATOR_REQUIRE`);
    }
    if (!contract.description) {
        throw new GenericRequiredError(`${E}.CREATE.DESCRIPTION_REQUIRE`);
    }
    if (contract.isConform === null || contract.isConform === undefined) {
        throw new GenericRequiredError(`${E}.CREATE.IS_CONFORM_REQUIRE`);
    }
}

export function validateTasksActionsUpdate(
    contract: TasksActionsUpdateContract
): asserts contract is TasksActionsUpdateValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(`${E}.UPDATE.UNIQ_ID_REQUIRE`);
    }
    if (!contract.reportUniqId) {
        throw new GenericRequiredError(`${E}.UPDATE.REPORT_UNIQ_ID_REQUIRE`);
    }
    if (!contract.date) {
        throw new GenericRequiredError(`${E}.UPDATE.DATE_REQUIRE`);
    }
    if (!contract.type) {
        throw new GenericRequiredError(`${E}.UPDATE.TYPE_REQUIRE`);
    }
    if (!contract.operator) {
        throw new GenericRequiredError(`${E}.UPDATE.OPERATOR_REQUIRE`);
    }
    if (!contract.description) {
        throw new GenericRequiredError(`${E}.UPDATE.DESCRIPTION_REQUIRE`);
    }
    if (contract.isConform === null || contract.isConform === undefined) {
        throw new GenericRequiredError(`${E}.UPDATE.IS_CONFORM_REQUIRE`);
    }
}

export function validateTasksActionsDelete(
    contract: TasksActionsDeleteContract
): asserts contract is TasksActionsDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(`${E}.UPDATE.UNIQ_ID_REQUIRE`);
    }
}

export function validateTasksActionsTypeFilter(
    contract: TasksActionsTypeFilterContract
): asserts contract is TasksActionsTypeFilterValidateContract {
    if (!contract.reportUniqId) {
        throw new GenericRequiredError(`${E}.CREATE.REPORT_UNIQ_ID_REQUIRE`);
    }
}
