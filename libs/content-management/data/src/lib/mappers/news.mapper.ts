import { Service, inject } from '@angular/core';
import {
    NewsEntity,
    NewsProps,
    NewsStatus,
} from '@cmz/content-management-domain';
import {
    MapperUtils,
    PaginatedMapper,
    TypeMediaMapper,
} from '@cmz/shared-data';
import { NewsItemApiDto } from '../dtos/news-response-api.dto';

/**
 * `category`/`subCategory` portent le NOM ici (liste) — diverge
 * délibérément du détail (`NewsFindOneProps`, id) ; même précédent que
 * `team-organization/participants.team` (liste = nom, détail = id).
 */
@Service()
export class NewsMapper extends PaginatedMapper<NewsEntity, NewsItemApiDto> {
    private readonly typeMediaMapper = inject(TypeMediaMapper);
    private readonly entityCache = new Map<string, NewsEntity>();

    protected mapItemFromDto(dto: NewsItemApiDto): NewsEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: NewsProps = {
            uniqId: dto.id,
            type: this.typeMediaMapper.parse(dto.type),
            title: dto.title,
            category: dto.category?.name ?? '',
            subCategory: dto.sub_category?.name ?? '',
            status: dto.is_published
                ? NewsStatus.PUBLISH
                : NewsStatus.UNPUBLISH,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new NewsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
