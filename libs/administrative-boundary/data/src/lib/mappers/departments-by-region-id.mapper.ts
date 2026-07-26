import { Service } from '@angular/core';
import {
    DepartmentsByRegionIdEntity,
    DepartmentsByRegionIdProps,
    Status,
} from '@cmz/administrative-boundary-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { DepartmentsByRegionIdItemApiDto } from '../dtos/departments-by-region-id-response-api.dto';

@Service()
export class DepartmentsByRegionIdMapper extends PaginatedMapper<
    DepartmentsByRegionIdEntity,
    DepartmentsByRegionIdItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        DepartmentsByRegionIdEntity
    >();

    protected mapItemFromDto(
        dto: DepartmentsByRegionIdItemApiDto
    ): DepartmentsByRegionIdEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: DepartmentsByRegionIdProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            populationSize: dto.population_size,
            municipalitiesCount: dto.municipalities_count,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new DepartmentsByRegionIdEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
