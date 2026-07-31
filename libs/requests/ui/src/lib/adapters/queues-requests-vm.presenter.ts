import { QueuesRequestsEntity } from '@cmz/requests-domain';
import {
    REPORT_SOURCE_LABEL,
    REPORT_TYPE_LABEL,
    TELECOM_OPERATOR_LABEL,
} from '@cmz/shared-ui';
import { QueuesRequestsVmProps } from './queues-requests-vm-props.interface';

const T = 'REQUESTS.QUEUES';

export class QueuesRequestsPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(
        item: QueuesRequestsEntity,
        permission: { canTake: boolean }
    ): QueuesRequestsVmProps {
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
