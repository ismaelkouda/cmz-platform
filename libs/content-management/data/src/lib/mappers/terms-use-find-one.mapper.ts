import { Service } from '@angular/core';
import {
    TermsUseFindOneEntity,
    TermsUseFindOneProps,
    TermsUseStatus,
} from '@cmz/content-management-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { TermsUseFindOneItemApiDto } from '../dtos/terms-use-find-one-response-api.dto';

@Service()
export class TermsUseFindOneMapper extends SimpleResponseMapper<
    TermsUseFindOneEntity,
    TermsUseFindOneItemApiDto
> {
    private readonly entityCache = new Map<string, TermsUseFindOneEntity>();

    protected mapItemFromDto(
        dto: TermsUseFindOneItemApiDto
    ): TermsUseFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: TermsUseFindOneProps = {
            uniqId: dto.id,
            version: dto.version,
            status: dto.is_published
                ? TermsUseStatus.PUBLISH
                : TermsUseStatus.UNPUBLISH,
            content: dto.content,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new TermsUseFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
