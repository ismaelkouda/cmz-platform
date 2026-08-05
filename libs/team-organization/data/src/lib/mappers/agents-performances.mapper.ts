import { Service } from '@angular/core';
import {
    AgentsPerformancesEntity,
    AgentsPerformancesProps,
    isAgentsPerformancesStatus,
} from '@cmz/team-organization-domain';
import { ApiError, MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { AgentsPerformancesItemApiDto } from '../dtos/agents-performances-response-api.dto';

/**
 * Même schéma que `ParticipantsMapper` : garde de type
 * (`isAgentsPerformancesStatus`) puis assignation directe du wire validé —
 * pas de `Record<StatusDto, Status>` intermédiaire.
 */
@Service()
export class AgentsPerformancesMapper extends PaginatedMapper<
    AgentsPerformancesEntity,
    AgentsPerformancesItemApiDto
> {
    private readonly entityCache = new Map<string, AgentsPerformancesEntity>();

    protected mapItemFromDto(
        dto: AgentsPerformancesItemApiDto
    ): AgentsPerformancesEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        if (!isAgentsPerformancesStatus(dto.status)) {
            throw ApiError.invalidResponse(
                `AgentsPerformancesStatus wire inconnue: ${dto.status}`
            );
        }

        const props: AgentsPerformancesProps = {
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
        const entity = cached
            ? cached.with(props)
            : new AgentsPerformancesEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
