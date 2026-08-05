import { resolveOpenEndedEndDate } from '@cmz/shared-domain';
import { DailyGoalFilterContract } from '../contracts/daily-goal-filter.contract';

/**
 * `DailyGoalFilterContract` a `startDate`/`endDate` (period côté legacy)
 * — même schéma que `agentsPerformancesFilterEntity`/
 * `queues-processing-filter.entity.ts` (référence workflow-action).
 */
export function dailyGoalFilterEntity(
    contract: DailyGoalFilterContract
): DailyGoalFilterContract {
    return {
        ...contract,
        endDate: resolveOpenEndedEndDate(contract.startDate, contract.endDate),
    };
}
