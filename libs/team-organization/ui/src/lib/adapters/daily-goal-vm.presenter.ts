import { DailyGoalEntity } from '@cmz/team-organization-domain';
import { DAILY_GOAL_STATUS_LABEL } from '../constants/daily-goal-status-label.constant';
import { dailyGoalStatusStyleOf } from '../mappers/daily-goal-status-style.mapper';
import { DailyGoalVmProps } from './daily-goal-vm-props.interface';

export class DailyGoalPresenter {
    constructor(private readonly t: (key: string) => string) {}

    map(item: DailyGoalEntity): DailyGoalVmProps {
        return {
            uniqId: item.uniqId,
            firstName: item.firstName,
            lastName: item.lastName,
            goalsSize: item.goalsSize,
            achievementsSize: item.achievementsSize,
            percentages: item.percentages,
            status: item.status,
            statusLabel: this.t(DAILY_GOAL_STATUS_LABEL[item.status]),
            statusStyle: dailyGoalStatusStyleOf(item.status),
            createdAt: item.createdAt,
        };
    }
}
