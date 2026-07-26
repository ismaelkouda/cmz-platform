import { Service } from '@angular/core';
import {
    MunicipalityEntity,
    MunicipalityProps,
    Status,
} from '@cmz/administrative-boundary-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { MunicipalityItemApiDto } from '../dtos/municipality-response-api.dto';

@Service()
export class MunicipalityMapper extends PaginatedMapper<
    MunicipalityEntity,
    MunicipalityItemApiDto
> {
    private readonly entityCache = new Map<string, MunicipalityEntity>();

    protected mapItemFromDto(dto: MunicipalityItemApiDto): MunicipalityEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: MunicipalityProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            region: { id: dto.region.id, name: dto.region.name },
            department: { id: dto.department.id, name: dto.department.name },
            populationSize: dto.population_size,
            infrastructureCount: dto.infrastructure_size,
            status: dto.is_active ? Status.ACTIVE : Status.INACTIVE,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new MunicipalityEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
