import { Service } from '@angular/core';
import {
    LegalNoticeEntity,
    LegalNoticeProps,
    LegalNoticeStatus,
} from '@cmz/content-management-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { LegalNoticeItemApiDto } from '../dtos/legal-notice-response-api.dto';

@Service()
export class LegalNoticeMapper extends PaginatedMapper<
    LegalNoticeEntity,
    LegalNoticeItemApiDto
> {
    private readonly entityCache = new Map<string, LegalNoticeEntity>();

    protected mapItemFromDto(dto: LegalNoticeItemApiDto): LegalNoticeEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: LegalNoticeProps = {
            uniqId: dto.id,
            version: dto.version,
            status: dto.is_published
                ? LegalNoticeStatus.PUBLISH
                : LegalNoticeStatus.UNPUBLISH,
            createdAt: dto.created_at,
            publishedAt: dto.published_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new LegalNoticeEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
