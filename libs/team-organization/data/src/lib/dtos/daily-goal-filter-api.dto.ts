/** Wire filtre `daily-goal` — `start_date`/`end_date` seulement (period), voir `DailyGoalFilterContract`. */
export interface DailyGoalFilterApiDto {
    start_date?: Date;
    end_date?: Date;
}
