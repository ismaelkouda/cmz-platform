import { DailyGoalStatus } from '@cmz/team-organization-domain';
import { DailyGoalStatusStyle } from '../enums/daily-goal-status-style.enum';

const MAP: Record<DailyGoalStatus, DailyGoalStatusStyle> = {
    [DailyGoalStatus.ACTIVE]: DailyGoalStatusStyle.ACTIVE,
    [DailyGoalStatus.INACTIVE]: DailyGoalStatusStyle.INACTIVE,
};

/** Traduit un `DailyGoalStatus` (domaine) en style d'affichage — logique UI. */
export function dailyGoalStatusStyleOf(
    status: DailyGoalStatus
): DailyGoalStatusStyle {
    return MAP[status];
}
