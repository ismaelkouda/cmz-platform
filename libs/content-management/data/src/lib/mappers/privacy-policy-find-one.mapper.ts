import { Service } from '@angular/core';
import {
    PrivacyPolicyFindOneEntity,
    PrivacyPolicyFindOneProps,
    PrivacyPolicyStatus,
} from '@cmz/content-management-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { PrivacyPolicyFindOneItemApiDto } from '../dtos/privacy-policy-find-one-response-api.dto';

@Service()
export class PrivacyPolicyFindOneMapper extends SimpleResponseMapper<
    PrivacyPolicyFindOneEntity,
    PrivacyPolicyFindOneItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        PrivacyPolicyFindOneEntity
    >();

    protected mapItemFromDto(
        dto: PrivacyPolicyFindOneItemApiDto
    ): PrivacyPolicyFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['id'] });
        const props: PrivacyPolicyFindOneProps = {
            uniqId: dto.id,
            version: dto.version,
            status: dto.is_published
                ? PrivacyPolicyStatus.PUBLISH
                : PrivacyPolicyStatus.UNPUBLISH,
            content: dto.content,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };
        const cacheKey = `dto:${dto.id}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new PrivacyPolicyFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
