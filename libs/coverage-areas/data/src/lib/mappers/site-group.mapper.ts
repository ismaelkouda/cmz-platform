import { Service } from '@angular/core';
import {
    SiteGroupEntity,
    SiteGroupProps,
    Status,
} from '@cmz/coverage-areas-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { SiteGroupItemApiDto } from '../dtos/site-group-response-api.dto';

@Service()
export class SiteGroupMapper extends PaginatedMapper<
    SiteGroupEntity,
    SiteGroupItemApiDto
> {
    private readonly entityCache = new Map<string, SiteGroupEntity>();

    protected mapItemFromDto(dto: SiteGroupItemApiDto): SiteGroupEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: SiteGroupProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new SiteGroupEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
