import { DailyGoalStatus } from '@cmz/team-organization-domain';

/** Clés i18n des libellés de statut objectif journalier — présentation pure, même convention que `AGENTS_PERFORMANCES_STATUS_LABEL`. */
export const DAILY_GOAL_STATUS_LABEL: Record<DailyGoalStatus, string> = {
    [DailyGoalStatus.ACTIVE]: 'COMMON.ACTIVE',
    [DailyGoalStatus.INACTIVE]: 'COMMON.INACTIVE',
};
