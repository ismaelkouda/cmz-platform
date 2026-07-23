import { Service } from '@angular/core';
import {
    InfrastructureTypeEntity,
    InfrastructureTypeProps,
    Status,
} from '@cmz/administrative-infrastructure-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { InfrastructureTypeItemApiDto } from '../dtos/infrastructure-type-response-api.dto';

@Service()
export class InfrastructureTypeMapper extends PaginatedMapper<
    InfrastructureTypeEntity,
    InfrastructureTypeItemApiDto
> {
    private readonly entityCache = new Map<string, InfrastructureTypeEntity>();

    protected mapItemFromDto(
        dto: InfrastructureTypeItemApiDto
    ): InfrastructureTypeEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: InfrastructureTypeProps = {
            uniqId: dto.id,
            name: dto.name,
            description: dto.description,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new InfrastructureTypeEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
