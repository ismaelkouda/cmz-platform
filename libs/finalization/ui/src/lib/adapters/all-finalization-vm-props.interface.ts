import { TableRowBase } from '@cmz/shared-ui';

export interface AllFinalizationVmProps extends TableRowBase {
    uniqId: string;
    reportTypeLabel: string;
    operatorsLabel: string;
    sourceLabel: string;
    initiatorPhoneNumber: string;
    reportedAt: string;
    actionsRef: string;
}
