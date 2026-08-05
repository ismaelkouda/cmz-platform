import { DailyGoalStatus } from '@cmz/team-organization-domain';
import { TableRowBase } from '@cmz/shared-ui';
import { DailyGoalStatusStyle } from '../enums/daily-goal-status-style.enum';

export interface DailyGoalVmProps extends TableRowBase {
    uniqId: string;
    firstName: string;
    lastName: string;
    goalsSize: string;
    achievementsSize: string;
    percentages: string;
    status: DailyGoalStatus;
    statusLabel: string;
    statusStyle: DailyGoalStatusStyle;
    createdAt: string;
}
