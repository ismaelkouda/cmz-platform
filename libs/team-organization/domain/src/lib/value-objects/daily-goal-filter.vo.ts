import { DailyGoalFilterContract } from '../contracts/daily-goal-filter.contract';
import { validateDailyGoalFilter } from '../validators/daily-goal-filter.validator';

export function dailyGoalFilterVo(
    contract: DailyGoalFilterContract
): DailyGoalFilterContract {
    const resolved: DailyGoalFilterContract = { ...contract };
    validateDailyGoalFilter(resolved);
    return resolved;
}
