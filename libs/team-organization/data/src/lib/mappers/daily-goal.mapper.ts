import { Service } from '@angular/core';
import {
    DailyGoalEntity,
    DailyGoalProps,
    isDailyGoalStatus,
} from '@cmz/team-organization-domain';
import { ApiError, MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { DailyGoalItemApiDto } from '../dtos/daily-goal-response-api.dto';

/**
 * Même schéma que `AgentsPerformancesMapper`/`ParticipantsMapper` : garde
 * de type (`isDailyGoalStatus`) puis assignation directe du wire validé —
 * pas de `Record<StatusDto, Status>` intermédiaire.
 */
@Service()
export class DailyGoalMapper extends PaginatedMapper<
    DailyGoalEntity,
    DailyGoalItemApiDto
> {
    private readonly entityCache = new Map<string, DailyGoalEntity>();

    protected mapItemFromDto(dto: DailyGoalItemApiDto): DailyGoalEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        if (!isDailyGoalStatus(dto.status)) {
            throw ApiError.invalidResponse(
                `DailyGoalStatus wire inconnue: ${dto.status}`
            );
        }

        const props: DailyGoalProps = {
            uniqId: dto.id,
            firstName: dto.user.first_name,
            lastName: dto.user.last_name,
            goalsSize: dto.task_target,
            achievementsSize: dto.tasks_completed,
            percentages: dto.percentage,
            status: dto.status,
            createdAt: dto.created_at,
        };

        const cacheKey = `dto:${props.uniqId}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new DailyGoalEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
