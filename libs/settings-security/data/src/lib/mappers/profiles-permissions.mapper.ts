import { Service } from '@angular/core';
import {
    ProfilesPermissionsEntity,
    ProfilesPermissionsProps,
    ProfilesPermissionsStatus,
} from '@cmz/settings-security-domain';
import { MapperUtils, PaginatedMapper } from '@cmz/shared-data';
import { ProfilesPermissionsItemApiDto } from '../dtos/profiles-permissions-response-api.dto';

@Service()
export class ProfilesPermissionsMapper extends PaginatedMapper<
    ProfilesPermissionsEntity,
    ProfilesPermissionsItemApiDto
> {
    private readonly entityCache = new Map<string, ProfilesPermissionsEntity>();

    protected mapItemFromDto(
        dto: ProfilesPermissionsItemApiDto
    ): ProfilesPermissionsEntity {
        MapperUtils.validateDto(dto, { required: ['uniq_id'] });

        const props: ProfilesPermissionsProps = {
            uniqId: dto.uniq_id,
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
            // Fix par rapport au source : `users_count` est une string au
            // wire (bug de typage), converti en `number` ici.
            usersCount: Number(dto.users_count),
            status: dto.is_active
                ? ProfilesPermissionsStatus.ACTIVE
                : ProfilesPermissionsStatus.INACTIVE,
            createdAt: dto.created_at,
            updatedAt: dto.updated_at,
        };

        const cacheKey = `dto:${props.uniqId}`;
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new ProfilesPermissionsEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }
}
