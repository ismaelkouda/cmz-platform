import { Service } from '@angular/core';
import {
    RegionEntity,
    RegionProps,
    Status,
} from '@cmz/administrative-boundary-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { RegionItemApiDto } from '../dtos/region-response-api.dto';

@Service()
export class RegionMapper extends PaginatedMapper<
    RegionEntity,
    RegionItemApiDto
> {
    private readonly entityCache = new Map<string, RegionEntity>();

    protected mapItemFromDto(dto: RegionItemApiDto): RegionEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: RegionProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            populationSize: dto.population_size,
            infrastructureCount: dto.infrastructure_size,
            departmentsCount: dto.departments_count,
            municipalitiesCount: dto.municipalities_count,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new RegionEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
