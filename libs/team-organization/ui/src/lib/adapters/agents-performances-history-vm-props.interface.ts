import { TableRowBase } from '@cmz/shared-ui';

export interface AgentsPerformancesHistoryVmProps extends TableRowBase {
    uniqId: string;
    reportType: string;
    operators: string;
    source: string;
    initiatorPhoneNumber: string;
    createdAt: string;
    actionsRef: string;
}
