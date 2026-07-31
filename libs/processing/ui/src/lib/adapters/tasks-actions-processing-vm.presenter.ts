import { TasksActionsEntity } from '@cmz/processing-domain';
import { TELECOM_OPERATOR_LABEL } from '@cmz/shared-ui';
import { TasksActionsProcessingVmProps } from './tasks-actions-processing-vm-props.interface';

const T = 'PROCESSING.TASKS.ACTIONS';

export class TasksActionsProcessingPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: TasksActionsEntity,
        permission: {
            canTreat: boolean;
            isOpenForTreatment: boolean;
            tooltip: { edit: string; delete: string };
        }
    ): TasksActionsProcessingVmProps {
        const blocked =
            item.shouldNotifyUser ||
            !permission.canTreat ||
            !permission.isOpenForTreatment;

        return {
            uniqId: item.uniqId,
            type: item.type,
            code: item.code,
            date: item.formatDate,
            description: item.description,
            operatorsLabel: item.operators
                .map((op) => this.t(TELECOM_OPERATOR_LABEL[op]))
                .join(', '),
            createdBy: item.createdBy,
            conformLabel: this.t(item.isConform),
            shouldNotifyUser: item.shouldNotifyUser,
            actionsRef: item.actionsRef,
            actionButtons: {
                edit: {
                    tooltip:
                        permission.canTreat &&
                        !item.shouldNotifyUser &&
                        permission.isOpenForTreatment
                            ? this.t(`${T}.TOOLTIP.EDIT`)
                            : permission.tooltip.edit,
                    disabled: blocked,
                },
                view: {
                    tooltip: this.t(`${T}.TOOLTIP.SEE_MORE`),
                    disabled: false,
                },
                delete: {
                    tooltip:
                        permission.canTreat &&
                        !item.shouldNotifyUser &&
                        permission.isOpenForTreatment
                            ? this.t(`${T}.TOOLTIP.DELETE`)
                            : permission.tooltip.delete,
                    disabled: blocked,
                },
            },
        };
    }
}
