import { Service } from '@angular/core';
import {
    PrivacyPolicyEntity,
    PrivacyPolicyProps,
    PrivacyPolicyStatus,
} from '@cmz/content-management-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { PrivacyPolicyItemApiDto } from '../dtos/privacy-policy-response-api.dto';

@Service()
export class PrivacyPolicyMapper extends PaginatedMapper<
    PrivacyPolicyEntity,
    PrivacyPolicyItemApiDto
> {
    private readonly entityCache = new Map<string, PrivacyPolicyEntity>();

    protected mapItemFromDto(
        dto: PrivacyPolicyItemApiDto
    ): PrivacyPolicyEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: PrivacyPolicyProps = {
            uniqId: dto.id,
            version: dto.version,
            status: dto.is_published
                ? PrivacyPolicyStatus.PUBLISH
                : PrivacyPolicyStatus.UNPUBLISH,
            createdAt: dto.created_at,
            publishedAt: dto.published_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new PrivacyPolicyEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
