import { TableRowBase } from '@cmz/shared-ui';

export interface AllProcessingVmProps extends TableRowBase {
    uniqId: string;
    reportTypeLabel: string;
    operatorsLabel: string;
    sourceLabel: string;
    initiatorPhoneNumber: string;
    reportedAt: string;
    actionsRef: string;
}
