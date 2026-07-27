import { Service } from '@angular/core';
import {
    FiberType,
    OpticalFiberNetworkFindOneEntity,
    OpticalFiberNetworkFindOneProps,
    Operator,
} from '@cmz/coverage-areas-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { OpticalFiberNetworkFindOneItemApiDto } from '../dtos/optical-fiber-network-find-one-response-api.dto';

@Service()
export class OpticalFiberNetworkFindOneMapper extends SimpleResponseMapper<
    OpticalFiberNetworkFindOneEntity,
    OpticalFiberNetworkFindOneItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        OpticalFiberNetworkFindOneEntity
    >();

    protected mapItemFromDto(
        dto: OpticalFiberNetworkFindOneItemApiDto
    ): OpticalFiberNetworkFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: OpticalFiberNetworkFindOneProps = {
            uniqId: dto.id,
            name: dto.name,
            operator: dto.operator as Operator,
            fiberConstructorId: String(dto.fiber_constructor_id ?? ''),
            fiberConstructorName: dto.fiber_constructor_name,
            type: dto.type as FiberType,
            geomUrl: dto.geom_url || dto.geom_file_url,
            geom: dto.geom,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new OpticalFiberNetworkFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
