import { AgentsPerformancesStatus } from '@cmz/team-organization-domain';
import { TableRowBase } from '@cmz/shared-ui';
import { AgentsPerformancesStatusStyle } from '../enums/agents-performances-status-style.enum';

export interface AgentsPerformancesVmProps extends TableRowBase {
    uniqId: string;
    firstName: string;
    lastName: string;
    goalsSize: string;
    achievementsSize: string;
    percentages: string;
    status: AgentsPerformancesStatus;
    statusLabel: string;
    statusStyle: AgentsPerformancesStatusStyle;
    createdAt: string;
    actionsRef: string;
}
