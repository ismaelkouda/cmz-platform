import { Injectable } from '@angular/core';
import { ResourcesEntity } from '@pages/seos-reference/domain/entities/resources/resources.entity';
import { ResourcesProps } from '@pages/seos-reference/domain/interfaces/resources/resources-props.interface';
import { ResourcesItemApiDto } from '@pages/seos-reference/infrastructure/api/dto/resources/resources-response-api.dto';
import { PaginatedMapper } from '@shared/data/mappers/base/paginated-response.mapper';
import { MapperUtils } from '@shared/domain/utils/mapper-utils';

@Injectable({
    providedIn: 'root',
})
export class ResourcesMapper extends PaginatedMapper<
    ResourcesEntity,
    ResourcesItemApiDto
> {
    private readonly entityCache = new Map<string, ResourcesEntity>();

    protected mapItemFromDto(dto: ResourcesItemApiDto): ResourcesEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: ResourcesProps = {
            uniqId: dto.id,
            code: dto.code,
            name: dto.name,
            description: dto.description,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new ResourcesEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
