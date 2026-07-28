import { Service, inject } from '@angular/core';
import { isPlatform } from '@cmz/shared-domain';
import {
    SlideEntity,
    SlideProps,
    SlideStatus,
} from '@cmz/content-management-domain';
import {
    MapperUtils,
    PaginatedMapper,
    TypeMediaMapper,
} from '@cmz/shared-data';
import { SlideItemApiDto } from '../dtos/slide-response-api.dto';

@Service()
export class SlideMapper extends PaginatedMapper<SlideEntity, SlideItemApiDto> {
    private readonly typeMediaMapper = inject(TypeMediaMapper);
    private readonly entityCache = new Map<string, SlideEntity>();

    protected mapItemFromDto(dto: SlideItemApiDto): SlideEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: SlideProps = {
            uniqId: dto.id,
            type: this.typeMediaMapper.parse(dto.type),
            title: dto.title,
            subtitle: dto.subtitle,
            order: dto.order,
            platforms: (dto.platforms ?? []).filter(isPlatform),
            status: dto.is_active ? SlideStatus.ACTIVE : SlideStatus.INACTIVE,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new SlideEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
