import { Service } from '@angular/core';
import {
    MobileNetworkFindOneEntity,
    MobileNetworkFindOneProps,
    Operator,
    Technology,
} from '@cmz/coverage-areas-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { MobileNetworkFindOneItemApiDto } from '../dtos/mobile-network-find-one-response-api.dto';

@Service()
export class MobileNetworkFindOneMapper extends SimpleResponseMapper<
    MobileNetworkFindOneEntity,
    MobileNetworkFindOneItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        MobileNetworkFindOneEntity
    >();

    protected mapItemFromDto(
        dto: MobileNetworkFindOneItemApiDto
    ): MobileNetworkFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: MobileNetworkFindOneProps = {
            uniqId: dto.id,
            siteId: dto.site_id,
            siteName: dto.site_name,
            infrastructureType: dto.infrastructure_type,
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
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new MobileNetworkFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
