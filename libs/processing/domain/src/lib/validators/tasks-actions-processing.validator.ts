import { GenericRequiredError } from '@cmz/shared-domain';
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

const E = 'PROCESSING.TASKS.ACTIONS.FORM.ERROR';

export function validateTasksActionsFilter(
    contract: TasksActionsProcessingFilterContract
): asserts contract is TasksActionsProcessingFilterValidateContract {
    if (!contract.reportUniqId) {
        throw new GenericRequiredError(`${E}.CREATE.REPORT_UNIQ_ID_REQUIRE`);
    }
}

export function validateTasksActionsCreate(
    contract: TasksActionsProcessingCreateContract
): asserts contract is TasksActionsProcessingCreateValidateContract {
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
    contract: TasksActionsProcessingUpdateContract
): asserts contract is TasksActionsProcessingUpdateValidateContract {
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
    contract: TasksActionsProcessingDeleteContract
): asserts contract is TasksActionsProcessingDeleteValidateContract {
    if (!contract.uniqId) {
        throw new GenericRequiredError(`${E}.UPDATE.UNIQ_ID_REQUIRE`);
    }
}

export function validateTasksActionsTypeFilter(
    contract: TasksActionsTypeProcessingFilterContract
): asserts contract is TasksActionsTypeProcessingFilterValidateContract {
    if (!contract.reportUniqId) {
        throw new GenericRequiredError(`${E}.CREATE.REPORT_UNIQ_ID_REQUIRE`);
    }
}
