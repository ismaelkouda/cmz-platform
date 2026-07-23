import { Service } from '@angular/core';
import {
    InfrastructureEntity,
    InfrastructureProps,
} from '@cmz/administrative-infrastructure-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { InfrastructureItemApiDto } from '../dtos/infrastructure-response-api.dto';

@Service()
export class InfrastructureMapper extends PaginatedMapper<
    InfrastructureEntity,
    InfrastructureItemApiDto
> {
    private readonly entityCache = new Map<string, InfrastructureEntity>();

    protected mapItemFromDto(
        dto: InfrastructureItemApiDto
    ): InfrastructureEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: InfrastructureProps = {
            uniqId: dto.id,
            name: dto.name,
            type: dto.infrastructure_type,
            description: dto.description,
            region: dto.region?.name,
            department: dto.department?.name,
            municipality: dto.municipality?.name,
            position: dto.position,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new InfrastructureEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
