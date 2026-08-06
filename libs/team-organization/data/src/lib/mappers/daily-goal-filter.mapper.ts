import { DailyGoalFilterContract } from '@cmz/team-organization-domain';
import { DailyGoalFilterApiDto } from '../dtos/daily-goal-filter-api.dto';

export function dailyGoalFilterMapper(
    contract: DailyGoalFilterContract
): DailyGoalFilterApiDto {
    const params: DailyGoalFilterApiDto = {};

    if (contract.startDate) {
        params.start_date = contract.startDate;
    }
    if (contract.endDate) {
        params.end_date = contract.endDate;
    }

    return params;
}
