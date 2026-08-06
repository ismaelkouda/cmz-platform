import { PaginatedResponseDto } from '@cmz/shared-data';
import { AgentsPerformancesStatusApiDto } from './agents-performances-status-api.dto';

/**
 * Wire — item liste `agents-performances` (`AgentsPerformancesItemApiDto`
 * legacy). `user` imbriqué au wire (forme `{id, first_name, last_name,
 * phone, email}`, même shape que `ActorDto`), mais aplati côté domain —
 * voir `agents-performances.mapper.ts`, même traitement que `team` sur
 * `ParticipantsItemApiDto` (imbriqué au wire, remonté à plat côté props).
 */
export interface AgentsPerformancesItemApiDto {
    id: string;
    user: {
        id: string;
        first_name: string;
        last_name: string;
    };
    task_target: string;
    tasks_completed: string;
    percentage: string;
    status: AgentsPerformancesStatusApiDto;
    created_at: string;
}

export type AgentsPerformancesResponseApiDto =
    PaginatedResponseDto<AgentsPerformancesItemApiDto>;
