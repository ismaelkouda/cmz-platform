import { Service } from '@angular/core';
import {
    AgentsPerformancesHistoryEntity,
    AgentsPerformancesHistoryProps,
} from '@cmz/team-organization-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { AgentsPerformancesHistoryItemApiDto } from '../dtos/agents-performances-history-response-api.dto';

@Service()
export class AgentsPerformancesHistoryMapper extends PaginatedMapper<
    AgentsPerformancesHistoryEntity,
    AgentsPerformancesHistoryItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        AgentsPerformancesHistoryEntity
    >();

    protected mapItemFromDto(
        dto: AgentsPerformancesHistoryItemApiDto
    ): AgentsPerformancesHistoryEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });

        const props: AgentsPerformancesHistoryProps = {
            uniqId: dto.uniq_id,
            reportType: dto.report_type,
            operators: dto.operators,
            source: dto.source,
            initiatorPhoneNumber: dto.initiator_phone_number,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${dto.uniq_id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new AgentsPerformancesHistoryEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
