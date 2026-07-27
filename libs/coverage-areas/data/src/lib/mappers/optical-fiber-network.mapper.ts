import { Service } from '@angular/core';
import {
    FiberType,
    OpticalFiberNetworkEntity,
    OpticalFiberNetworkProps,
    Operator,
    Status,
} from '@cmz/coverage-areas-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { OpticalFiberNetworkItemApiDto } from '../dtos/optical-fiber-network-response-api.dto';

@Service()
export class OpticalFiberNetworkMapper extends PaginatedMapper<
    OpticalFiberNetworkEntity,
    OpticalFiberNetworkItemApiDto
> {
    private readonly entityCache = new Map<string, OpticalFiberNetworkEntity>();

    protected mapItemFromDto(
        dto: OpticalFiberNetworkItemApiDto
    ): OpticalFiberNetworkEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: OpticalFiberNetworkProps = {
            uniqId: dto.id,
            name: dto.name,
            operator: dto.operator as Operator,
            fiberConstructorId: String(dto.fiber_constructor_id ?? ''),
            fiberConstructorName: dto.fiber_constructor_name,
            type: dto.type as FiberType,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new OpticalFiberNetworkEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
