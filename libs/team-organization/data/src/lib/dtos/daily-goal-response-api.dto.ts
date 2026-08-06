import { PaginatedResponseDto } from '@cmz/shared-data';
import { DailyGoalStatusApiDto } from './daily-goal-status-api.dto';

/**
 * Wire — item liste `daily-goal` (`DailyGoalItemApiDto` legacy). `user`
 * imbriqué au wire (même shape que `ActorDto`), mais aplati côté domain —
 * voir `daily-goal.mapper.ts`, même traitement que `user` sur
 * `AgentsPerformancesItemApiDto`.
 */
export interface DailyGoalItemApiDto {
    id: string;
    user: {
        id: string;
        first_name: string;
        last_name: string;
    };
    task_target: string;
    tasks_completed: string;
    percentage: string;
    status: DailyGoalStatusApiDto;
    created_at: string;
}

export type DailyGoalResponseApiDto = PaginatedResponseDto<DailyGoalItemApiDto>;
