import { Service, inject } from '@angular/core';
import { isPlatform } from '@cmz/shared-domain';
import {
    SlideFindOneEntity,
    SlideFindOneProps,
    SlideStatus,
} from '@cmz/content-management-domain';
import {
    MapperUtils,
    SimpleResponseMapper,
    TypeMediaMapper,
} from '@cmz/shared-data';
import { SlideFindOneItemApiDto } from '../dtos/slide-find-one-response-api.dto';

@Service()
export class SlideFindOneMapper extends SimpleResponseMapper<
    SlideFindOneEntity,
    SlideFindOneItemApiDto
> {
    private readonly typeMediaMapper = inject(TypeMediaMapper);
    private readonly entityCache = new Map<string, SlideFindOneEntity>();

    protected mapItemFromDto(dto: SlideFindOneItemApiDto): SlideFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: SlideFindOneProps = {
            uniqId: dto.id,
            status: dto.is_active ? SlideStatus.ACTIVE : SlideStatus.INACTIVE,
            order: dto.order,
            timeDuration: dto.time_duration_in_seconds,
            type: this.typeMediaMapper.parse(dto.type),
            image: dto.image_url,
            video: dto.video_url,
            platforms: (dto.platforms ?? []).filter(isPlatform),
            startDate: new Date(dto.start_date),
            endDate: new Date(dto.end_date),
            title: dto.title,
            subtitle: dto.subtitle,
            content: dto.content,
            buttonLabel: dto.button_label ?? '',
            buttonUrl: dto.button_url ?? '',
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new SlideFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
