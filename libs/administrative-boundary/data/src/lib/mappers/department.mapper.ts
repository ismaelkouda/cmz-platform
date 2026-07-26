import { Service } from '@angular/core';
import {
    DepartmentEntity,
    DepartmentProps,
    Status,
} from '@cmz/administrative-boundary-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { DepartmentItemApiDto } from '../dtos/department-response-api.dto';

@Service()
export class DepartmentMapper extends PaginatedMapper<
    DepartmentEntity,
    DepartmentItemApiDto
> {
    private readonly entityCache = new Map<string, DepartmentEntity>();

    protected mapItemFromDto(dto: DepartmentItemApiDto): DepartmentEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: DepartmentProps = {
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
            : new DepartmentEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
