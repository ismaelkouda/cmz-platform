import { Service } from '@angular/core';
import {
    DepartmentFindOneEntity,
    DepartmentFindOneProps,
    Status,
} from '@cmz/administrative-boundary-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { DepartmentFindOneItemApiDto } from '../dtos/department-find-one-response-api.dto';

@Service()
export class DepartmentFindOneMapper extends SimpleResponseMapper<
    DepartmentFindOneEntity,
    DepartmentFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, DepartmentFindOneEntity>();

    protected mapItemFromDto(
        dto: DepartmentFindOneItemApiDto
    ): DepartmentFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: DepartmentFindOneProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            region: { id: dto.region.id, name: dto.region.name },
            populationSize: dto.population_size,
            infrastructureCount: dto.infrastructure_size,
            municipalitiesCount: dto.municipalities_count,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new DepartmentFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
