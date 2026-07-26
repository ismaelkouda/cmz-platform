import { Service } from '@angular/core';
import {
    RegionFindOneEntity,
    RegionFindOneProps,
    Status,
} from '@cmz/administrative-boundary-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { RegionFindOneItemApiDto } from '../dtos/region-find-one-response-api.dto';

@Service()
export class RegionFindOneMapper extends SimpleResponseMapper<
    RegionFindOneEntity,
    RegionFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, RegionFindOneEntity>();

    protected mapItemFromDto(
        dto: RegionFindOneItemApiDto
    ): RegionFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: RegionFindOneProps = {
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
        const entity = cached
            ? cached.with(props)
            : new RegionFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
