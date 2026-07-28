import { Service } from '@angular/core';
import {
    LegalNoticeFindOneEntity,
    LegalNoticeFindOneProps,
    LegalNoticeStatus,
} from '@cmz/content-management-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { LegalNoticeFindOneItemApiDto } from '../dtos/legal-notice-find-one-response-api.dto';

@Service()
export class LegalNoticeFindOneMapper extends SimpleResponseMapper<
    LegalNoticeFindOneEntity,
    LegalNoticeFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, LegalNoticeFindOneEntity>();

    protected mapItemFromDto(
        dto: LegalNoticeFindOneItemApiDto
    ): LegalNoticeFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: LegalNoticeFindOneProps = {
            uniqId: dto.id,
            version: dto.version,
            status: dto.is_published
                ? LegalNoticeStatus.PUBLISH
                : LegalNoticeStatus.UNPUBLISH,
            content: dto.content,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new LegalNoticeFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
