import { Service } from '@angular/core';
import { isPlatform } from '@cmz/shared-domain';
import {
    HomeFindOneEntity,
    HomeFindOneProps,
    HomeStatus,
} from '@cmz/content-management-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { HomeFindOneItemApiDto } from '../dtos/home-find-one-response-api.dto';

@Service()
export class HomeFindOneMapper extends SimpleResponseMapper<
    HomeFindOneEntity,
    HomeFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, HomeFindOneEntity>();

    protected mapItemFromDto(dto: HomeFindOneItemApiDto): HomeFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: HomeFindOneProps = {
            uniqId: dto.id,
            title: dto.title,
            resume: dto.resume,
            order: dto.order,
            platforms: (dto.platforms ?? []).filter(isPlatform),
            status: dto.is_active ? HomeStatus.ACTIVE : HomeStatus.INACTIVE,
            content: dto.content,
            image: dto.image_url,
            timeDurationInSeconds: dto.time_duration_in_seconds,
            buttonLabel: dto.button_label,
            buttonUrl: dto.button_url,
            startDate: new Date(dto.start_date),
            endDate: new Date(dto.end_date),
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new HomeFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
