import { ApproveReportStatesEntity } from '@cmz/report-states-domain';
import {
    REPORT_SOURCE_LABEL,
    REPORT_TYPE_LABEL,
    TELECOM_OPERATOR_LABEL,
} from '@cmz/shared-ui';
import { ApproveReportStatesVmProps } from './approve-report-states-vm-props.interface';

const T = 'REPORT_STATES.APPROVE';

export class ApproveReportStatesPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: ApproveReportStatesEntity,
        permission: { canTake: boolean }
    ): ApproveReportStatesVmProps {
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
                take: {
                    tooltip: this.t(
                        permission.canTake
                            ? `${T}.TOOLTIP.TAKE`
                            : `${T}.TOOLTIP.SEE_MORE`
                    ),
                    disabled: false,
                },
            },
        };
    }
}
