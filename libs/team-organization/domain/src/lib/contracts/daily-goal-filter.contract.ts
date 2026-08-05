/**
 * Filtre de liste `daily-goal`. Le wire legacy (`DailyGoalFilterDto`) n'a
 * que `startDate`/`endDate` (period) — contrairement à
 * `AgentsPerformancesFilterContract`, `daily-goal` n'a ni `search`, ni
 * `member`, ni `isAchieved` côté legacy (`daily-goal-filter.dto.ts`,
 * `daily-goal-filter.control.ts` : seulement 2 champs date). Reproduit à
 * l'identique, pas d'ajout de champs par analogie.
 */
export interface DailyGoalFilterContract {
    startDate?: Date;
    endDate?: Date;
}
