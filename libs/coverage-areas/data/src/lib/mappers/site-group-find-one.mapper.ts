import { Service } from '@angular/core';
import {
    SiteGroupFindOneEntity,
    SiteGroupFindOneProps,
    Status,
} from '@cmz/coverage-areas-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { SiteGroupFindOneItemApiDto } from '../dtos/site-group-find-one-response-api.dto';

@Service()
export class SiteGroupFindOneMapper extends SimpleResponseMapper<
    SiteGroupFindOneEntity,
    SiteGroupFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, SiteGroupFindOneEntity>();

    protected mapItemFromDto(
        dto: SiteGroupFindOneItemApiDto
    ): SiteGroupFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: SiteGroupFindOneProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new SiteGroupFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
