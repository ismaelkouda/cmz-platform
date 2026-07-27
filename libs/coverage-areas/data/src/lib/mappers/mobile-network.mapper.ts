import { Service } from '@angular/core';
import {
    MobileNetworkEntity,
    MobileNetworkProps,
    Operator,
    Status,
    Technology,
} from '@cmz/coverage-areas-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { MobileNetworkItemApiDto } from '../dtos/mobile-network-response-api.dto';

@Service()
export class MobileNetworkMapper extends PaginatedMapper<
    MobileNetworkEntity,
    MobileNetworkItemApiDto
> {
    private readonly entityCache = new Map<string, MobileNetworkEntity>();

    protected mapItemFromDto(
        dto: MobileNetworkItemApiDto
    ): MobileNetworkEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: MobileNetworkProps = {
            uniqId: dto.id,
            siteId: dto.site_id,
            siteName: dto.site_name,
            towerTypeId: dto.tower_type_id,
            towerTypeName: dto.tower_type_name,
            towerSize: dto.tower_size,
            technology: (Array.isArray(dto.technology)
                ? dto.technology
                : dto.technology
                  ? [dto.technology]
                  : []) as Technology[],
            operator: dto.operator as Operator,
            radius: dto.radius,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new MobileNetworkEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
