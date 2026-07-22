import { Injectable } from '@angular/core';
import { ResourcesFindOneEntity } from '@pages/seos-reference/domain/entities/resources/resources-find-one.entity';
import { ResourcesFindOneProps } from '@pages/seos-reference/domain/interfaces/resources/resources-find-one-props.interface';
import { ResourcesFindOneItemApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-find-one-response-api.dto';
import { SimpleResponseMapper } from '@shared/data/mappers/base/simple-response.mapper';
import { MapperUtils } from '@shared/domain/utils/mapper-utils';

@Injectable({
    providedIn: 'root',
})
export class ResourcesFindOneMapper extends SimpleResponseMapper<
    ResourcesFindOneEntity,
    ResourcesFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, ResourcesFindOneEntity>();

    protected mapItemFromDto(
        dto: ResourcesFindOneItemApiDto
    ): ResourcesFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: ResourcesFindOneProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new ResourcesFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
