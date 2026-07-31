import { TasksFinalizationEntity } from '@cmz/finalization-domain';
import {
    REPORT_SOURCE_LABEL,
    REPORT_TYPE_LABEL,
    TELECOM_OPERATOR_LABEL,
} from '@cmz/shared-ui';
import { TasksFinalizationVmProps } from './tasks-finalization-vm-props.interface';

const T = 'FINALIZATION.TASKS';

export class TasksFinalizationPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: TasksFinalizationEntity,
        permission: { canFinalize: boolean }
    ): TasksFinalizationVmProps {
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
                finalize: {
                    tooltip: this.t(
                        permission.canFinalize
                            ? `${T}.TOOLTIP.FINALIZE`
                            : `${T}.TOOLTIP.SEE_MORE`
                    ),
                    disabled: false,
                },
            },
        };
    }
}
