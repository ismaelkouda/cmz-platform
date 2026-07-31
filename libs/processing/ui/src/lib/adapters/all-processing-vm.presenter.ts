import { AllProcessingEntity } from '@cmz/processing-domain';
import {
    REPORT_SOURCE_LABEL,
    REPORT_TYPE_LABEL,
    TELECOM_OPERATOR_LABEL,
} from '@cmz/shared-ui';
import { AllProcessingVmProps } from './all-processing-vm-props.interface';

const T = 'PROCESSING.ALL';

export class AllProcessingPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: AllProcessingEntity): AllProcessingVmProps {
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
                view: {
                    tooltip: this.t(`${T}.TOOLTIP.SEE_MORE`),
                    disabled: false,
                },
            },
        };
    }
}
