import { Service } from '@angular/core';
import {
    TeamsEntity,
    TeamsProps,
    TeamsStatus,
} from '@cmz/team-organization-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { TeamsItemApiDto } from '../dtos/teams-response-api.dto';

@Service()
export class TeamsMapper extends PaginatedMapper<TeamsEntity, TeamsItemApiDto> {
    private readonly entityCache = new Map<string, TeamsEntity>();

    protected mapItemFromDto(dto: TeamsItemApiDto): TeamsEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });
        const props: TeamsProps = {
            uniqId: dto.uniq_id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            status: dto.is_active ? TeamsStatus.ACTIVE : TeamsStatus.INACTIVE,
            membersCount: dto.members_count,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.uniq_id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new TeamsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
