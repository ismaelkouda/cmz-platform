import { Service } from '@angular/core';
import {
    PermissionActions,
    PermissionTreeNode,
    ProfilesPermissionsFindOneEntity,
    ProfilesPermissionsFindOneProps,
} from '@cmz/settings-security-domain';
import { MapperUtils, SimpleResponseMapper } from '@cmz/shared-data';
import {
    PermissionApiDto,
    ProfilesPermissionsFindOneItemApiDto,
} from '../dtos/profiles-permissions-find-one-response-api.dto';

/**
 * Reconstruction fidèle de la logique récursive du source
 * (`ProfilesPermissionsFindOneMapper.mapPermissionNode`) : un nœud peut ne
 * pas porter ses propres `actions` au wire (dossier/catégorie sans droits
 * propres) — dans ce cas les actions "disponibles" sont héritées de
 * l'union des actions de ses enfants, et leur valeur par défaut reprend
 * l'état `checked` du nœud. Un nœud AVEC ses propres `actions` les garde
 * telles quelles. Ne pas aplatir (cf. décision actée : arbre fidèle).
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
                this.mapPermissionNode(node)
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

    private mapPermissionNode(dto: PermissionApiDto): PermissionTreeNode {
        const children = (dto.children ?? []).map((child) =>
            this.mapPermissionNode(child)
        );

        const ownActions = dto.data.actions ?? {};
        const hasOwnActions = Object.keys(ownActions).length > 0;

        const availableActions = hasOwnActions
            ? Object.keys(ownActions)
            : this.extractAvailableActionsFromChildren(children);

        const actions: PermissionActions = hasOwnActions
            ? { ...ownActions }
            : this.buildDefaultActions(
                  availableActions,
                  dto.data.checked ?? false
              );

        return {
            key: dto.data.value,
            label: dto.data.title,
            checked: dto.data.checked ?? false,
            actions,
            children,
        };
    }

    private extractAvailableActionsFromChildren(
        children: PermissionTreeNode[]
    ): string[] {
        const actionsSet = new Set<string>();
        children.forEach((child) => {
            Object.keys(child.actions).forEach((action) =>
                actionsSet.add(action)
            );
        });
        return Array.from(actionsSet);
    }

    private buildDefaultActions(
        availableActions: string[],
        checked: boolean
    ): PermissionActions {
        const result: Record<string, boolean> = {};
        availableActions.forEach((action) => {
            result[action] = checked;
        });
        return result as PermissionActions;
    }

    private buildPermissionsCacheKey(permissions: PermissionApiDto[]): string {
        return (
            'permissions:' +
            JSON.stringify(permissions.map((node) => node.data.value))
        );
    }
}
