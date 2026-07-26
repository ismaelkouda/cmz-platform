import { Service } from '@angular/core';
import {
    MunicipalityFindOneEntity,
    MunicipalityFindOneProps,
    Status,
} from '@cmz/administrative-boundary-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { MunicipalityFindOneItemApiDto } from '../dtos/municipality-find-one-response-api.dto';

@Service()
export class MunicipalityFindOneMapper extends SimpleResponseMapper<
    MunicipalityFindOneEntity,
    MunicipalityFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, MunicipalityFindOneEntity>();

    protected mapItemFromDto(
        dto: MunicipalityFindOneItemApiDto
    ): MunicipalityFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: MunicipalityFindOneProps = {
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
            : new MunicipalityFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
