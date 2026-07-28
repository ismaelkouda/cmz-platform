import { Service } from '@angular/core';
import { isPlatform } from '@cmz/shared-domain';
import {
    HomeEntity,
    HomeProps,
    HomeStatus,
} from '@cmz/content-management-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { HomeItemApiDto } from '../dtos/home-response-api.dto';

@Service()
export class HomeMapper extends PaginatedMapper<HomeEntity, HomeItemApiDto> {
    private readonly entityCache = new Map<string, HomeEntity>();

    protected mapItemFromDto(dto: HomeItemApiDto): HomeEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: HomeProps = {
            uniqId: dto.id,
            title: dto.title,
            resume: dto.resume,
            image: dto.image_url,
            order: dto.order,
            platforms: (dto.platforms ?? []).filter(isPlatform),
            status: dto.is_active ? HomeStatus.ACTIVE : HomeStatus.INACTIVE,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new HomeEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
