import {
    PermissionActions,
    PermissionTreeNode,
} from '@cmz/settings-security-domain';
import { PermissionApiDto } from '../dtos/profiles-permissions-find-one-response-api.dto';

/**
 * Reconstruction fidèle de la logique récursive du source
 * (`mapPermissionNode`, dupliquée à l'identique dans
 * `ProfilesPermissionsFindOneMapper` ET `ProfilesPermissionsPermissionsMapper`
 * côté source) — factorisée ici pour éviter la duplication, consommée par
 * les deux mappers (`profiles-permissions-find-one.mapper.ts` et
 * `profiles-permissions-permissions.mapper.ts`).
 */
export function mapPermissionApiNode(
    dto: PermissionApiDto
): PermissionTreeNode {
    const children = (dto.children ?? []).map((child) =>
        mapPermissionApiNode(child)
    );

    const ownActions = dto.data.actions ?? {};
    const hasOwnActions = Object.keys(ownActions).length > 0;

    const availableActions = hasOwnActions
        ? Object.keys(ownActions)
        : extractAvailableActionsFromChildren(children);

    const actions: PermissionActions = hasOwnActions
        ? { ...ownActions }
        : buildDefaultActions(availableActions, dto.data.checked ?? false);

    return {
        key: dto.data.value,
        label: dto.data.title,
        checked: dto.data.checked ?? false,
        actions,
        children,
    };
}

function extractAvailableActionsFromChildren(
    children: PermissionTreeNode[]
): string[] {
    const actionsSet = new Set<string>();
    children.forEach((child) => {
        Object.keys(child.actions).forEach((action) => actionsSet.add(action));
    });
    return Array.from(actionsSet);
}

function buildDefaultActions(
    availableActions: string[],
    checked: boolean
): PermissionActions {
    const result: Record<string, boolean> = {};
    availableActions.forEach((action) => {
        result[action] = checked;
    });
    return result as PermissionActions;
}
