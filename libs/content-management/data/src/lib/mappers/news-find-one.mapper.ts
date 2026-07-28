import { Service, inject } from '@angular/core';
import {
    NewsFindOneEntity,
    NewsFindOneProps,
    NewsStatus,
} from '@cmz/content-management-domain';
import {
    MapperUtils,
    SimpleResponseMapper,
    TypeMediaMapper,
} from '@cmz/shared-data';
import { NewsFindOneItemApiDto } from '../dtos/news-find-one-response-api.dto';

/**
 * `category`/`subCategory` portent l'id ici (détail, pré-remplit le select
 * en édition) — diverge délibérément de la liste (nom). Null-safety
 * corrigée (optional chaining sur les deux champs, contrairement au source
 * qui faisait `dto.category.id` sans `?.` — bug latent potentiel si l'API
 * renvoie un item sans catégorie, cf. bilan de recherche).
 */
@Service()
export class NewsFindOneMapper extends SimpleResponseMapper<
    NewsFindOneEntity,
    NewsFindOneItemApiDto
> {
    private readonly typeMediaMapper = inject(TypeMediaMapper);
    private readonly entityCache = new Map<string, NewsFindOneEntity>();

    protected mapItemFromDto(dto: NewsFindOneItemApiDto): NewsFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: NewsFindOneProps = {
            uniqId: dto.id,
            status: dto.is_published
                ? NewsStatus.PUBLISH
                : NewsStatus.UNPUBLISH,
            order: dto.order,
            type: this.typeMediaMapper.parse(dto.type),
            image: dto.image_url,
            video: dto.video_url,
            category: dto.category?.id ?? '',
            subCategory: dto.sub_category?.id ?? '',
            hashtags: dto.hashtags ?? [],
            title: dto.title,
            resume: dto.resume,
            content: dto.content,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new NewsFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
