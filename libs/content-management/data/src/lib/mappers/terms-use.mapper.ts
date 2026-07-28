import { Service } from '@angular/core';
import {
    TermsUseEntity,
    TermsUseProps,
    TermsUseStatus,
} from '@cmz/content-management-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { TermsUseItemApiDto } from '../dtos/terms-use-response-api.dto';

@Service()
export class TermsUseMapper extends PaginatedMapper<
    TermsUseEntity,
    TermsUseItemApiDto
> {
    private readonly entityCache = new Map<string, TermsUseEntity>();

    protected mapItemFromDto(dto: TermsUseItemApiDto): TermsUseEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: TermsUseProps = {
            uniqId: dto.id,
            version: dto.version,
            status: dto.is_published
                ? TermsUseStatus.PUBLISH
                : TermsUseStatus.UNPUBLISH,
            createdAt: dto.created_at,
            publishedAt: dto.published_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached ? cached.with(props) : new TermsUseEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
