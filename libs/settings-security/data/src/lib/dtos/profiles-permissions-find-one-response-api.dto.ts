import { SimpleResponseDto } from '@cmz/shared-data';

/**
 * Reconstruction fidèle du `PermissionTreeNodeApiDto extends TreeNode`
 * (PrimeNG) du source — ici sans dépendance PrimeNG, juste la forme de
 * données réellement consommée (`value`/`title`/`checked`/`actions`).
 * `actions` est un `Record<string, boolean>` au wire large, mais en
 * pratique restreint aux 6 clés de `PermissionAction` (kernel) — cf.
 * `IProfilesPermissionActions` source, byte-identique à notre
 * `PermissionActions` domaine.
 */
export type PermissionActionsApiDto = Record<string, boolean>;

export interface PermissionTreeNodeApiDto {
    value: string;
    title: string;
    slug?: string;
    checked: boolean;
    actions?: PermissionActionsApiDto;
}

export interface PermissionApiDto {
    data: PermissionTreeNodeApiDto;
    children?: PermissionApiDto[];
}

/**
 * Tous les champs sauf `permissions` sont optionnels au wire (fidèle au
 * source) — `MapperUtils.validateDto` ne vérifie que `permissions`.
 */
export interface ProfilesPermissionsFindOneItemApiDto {
    uniq_id?: string;
    name?: string;
    description?: string;
    permissions: PermissionApiDto[];
}

export type ProfilesPermissionsFindOneResponseApiDto =
    SimpleResponseDto<ProfilesPermissionsFindOneItemApiDto>;
