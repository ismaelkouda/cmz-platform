/**
 * Statut d'un objectif journalier (`Status` legacy — actif / inactif).
 * Même convention que `AgentsPerformancesStatus`/`ParticipantsStatus`
 * (valeurs wire-safe en minuscules, garde de type `isXStatus` plutôt
 * qu'un mapping enum-vers-enum séparé — voir `daily-goal.mapper.ts`,
 * qui suit exactement le même schéma que `AgentsPerformancesMapper`/
 * `ParticipantsMapper` : valider via la garde puis assigner `dto.status`
 * tel quel, pas de `Record<StatusDto, Status>` intermédiaire).
 */
export const DailyGoalStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
} as const;

export type DailyGoalStatus =
    (typeof DailyGoalStatus)[keyof typeof DailyGoalStatus];

const DAILY_GOAL_STATUS_VALUES = new Set<string>(
    Object.values(DailyGoalStatus)
);

export function isDailyGoalStatus(value: unknown): value is DailyGoalStatus {
    return typeof value === 'string' && DAILY_GOAL_STATUS_VALUES.has(value);
}
