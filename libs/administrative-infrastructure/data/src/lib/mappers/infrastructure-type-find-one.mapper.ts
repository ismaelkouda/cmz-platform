import { Service } from '@angular/core';
import {
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneProps,
} from '@cmz/administrative-infrastructure-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { InfrastructureTypeFindOneItemApiDto } from '../dtos/infrastructure-type-find-one-response-api.dto';

@Service()
export class InfrastructureTypeFindOneMapper extends SimpleResponseMapper<
    InfrastructureTypeFindOneEntity,
    InfrastructureTypeFindOneItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        InfrastructureTypeFindOneEntity
    >();

    protected mapItemFromDto(
        dto: InfrastructureTypeFindOneItemApiDto
    ): InfrastructureTypeFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: InfrastructureTypeFindOneProps = {
            uniqId: dto.id,
            name: dto.name,
            description: dto.description,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new InfrastructureTypeFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
