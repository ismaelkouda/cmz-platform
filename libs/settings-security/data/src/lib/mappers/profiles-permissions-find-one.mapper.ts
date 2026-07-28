import { Service } from '@angular/core';
import {
    ProfilesPermissionsFindOneEntity,
    ProfilesPermissionsFindOneProps,
} from '@cmz/settings-security-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import { ProfilesPermissionsFindOneItemApiDto } from '../dtos/profiles-permissions-find-one-response-api.dto';
import { mapPermissionApiNode } from './permission-tree-node.mapper.util';

/**
 * Reconstruction fidèle de la logique récursive du source
 * (`ProfilesPermissionsFindOneMapper.mapPermissionNode`, cf.
 * `permission-tree-node.mapper.util.ts` pour le détail) — ne pas aplatir
 * (cf. décision actée : arbre fidèle).
 */
@Service()
export class ProfilesPermissionsFindOneMapper extends SimpleResponseMapper<
    ProfilesPermissionsFindOneEntity,
    ProfilesPermissionsFindOneItemApiDto
> {
    private readonly entityCache = new Map<
        string,
        ProfilesPermissionsFindOneEntity
    >();

    protected mapItemFromDto(
        dto: ProfilesPermissionsFindOneItemApiDto
    ): ProfilesPermissionsFindOneEntity {
        MapperUtils.validateDto(dto, { required: ['permissions'] });

        const props: ProfilesPermissionsFindOneProps = {
            uniqId: dto.uniq_id ?? '',
            name: dto.name ?? '',
            description: dto.description ?? '',
            permissions: dto.permissions.map((node) =>
                mapPermissionApiNode(node)
            ),
        };

        const cacheKey =
            dto.uniq_id ?? this.buildPermissionsCacheKey(dto.permissions);
        const cached = this.entityCache.get(cacheKey);
        const entity = cached
            ? cached.with(props)
            : new ProfilesPermissionsFindOneEntity(props);
        this.entityCache.set(cacheKey, entity);
        return entity;
    }

    private buildPermissionsCacheKey(
        permissions: ProfilesPermissionsFindOneItemApiDto['permissions']
    ): string {
        return (
            'permissions:' +
            JSON.stringify(permissions.map((node) => node.data.value))
        );
    }
}
