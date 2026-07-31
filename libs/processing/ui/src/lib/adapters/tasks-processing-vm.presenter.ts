import { TasksProcessingEntity } from '@cmz/processing-domain';
import {
    REPORT_SOURCE_LABEL,
    REPORT_TYPE_LABEL,
    TELECOM_OPERATOR_LABEL,
} from '@cmz/shared-ui';
import { TasksProcessingVmProps } from './tasks-processing-vm-props.interface';

const T = 'PROCESSING.TASKS';

export class TasksProcessingPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: TasksProcessingEntity,
        permission: { canTreat: boolean }
    ): TasksProcessingVmProps {
        return {
            uniqId: item.uniqId,
            reportTypeLabel: this.t(REPORT_TYPE_LABEL[item.reportType]),
            operatorsLabel: item.operators
                .map((operator) => this.t(TELECOM_OPERATOR_LABEL[operator]))
                .join(', '),
            sourceLabel: this.t(REPORT_SOURCE_LABEL[item.source]),
            initiatorPhoneNumber: item.initiatorPhoneNumber,
            reportedAt: item.reportedAt,
            actionsRef: item.uniqId,
            actionButtons: {
                treat: {
                    tooltip: this.t(
                        permission.canTreat
                            ? `${T}.TOOLTIP.TREAT`
                            : `${T}.TOOLTIP.SEE_MORE`
                    ),
                    disabled: false,
                },
            },
        };
    }
}
