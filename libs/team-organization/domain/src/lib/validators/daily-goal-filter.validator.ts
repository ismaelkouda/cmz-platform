import { assertValidDateRange } from '@cmz/shared-domain';
import { DailyGoalFilterContract } from '../contracts/daily-goal-filter.contract';

export function validateDailyGoalFilter(
    contract: DailyGoalFilterContract
): void {
    assertValidDateRange(contract.startDate, contract.endDate);
}
