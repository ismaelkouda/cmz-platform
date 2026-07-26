import { Service } from '@angular/core';
import {
    MunicipalitiesByDepartmentIdEntity,
    MunicipalitiesByDepartmentIdProps,
    Status,
} from '@cmz/administrative-boundary-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { MunicipalitiesByDepartmentIdItemApiDto } from '../dtos/municipalities-by-department-id-response-api.dto';

@Service()
export class MunicipalitiesByDepartmentIdMapper extends PaginatedMapper<
    MunicipalitiesByDepartmentIdEntity,
    MunicipalitiesByDepartmentIdItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        MunicipalitiesByDepartmentIdEntity
    >();

    protected mapItemFromDto(
        dto: MunicipalitiesByDepartmentIdItemApiDto
    ): MunicipalitiesByDepartmentIdEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: MunicipalitiesByDepartmentIdProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            populationSize: dto.population_size,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new MunicipalitiesByDepartmentIdEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
