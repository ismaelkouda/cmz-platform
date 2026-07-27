/**
 * Wire snake_case — le source utilisait `CurrentUser` directement comme DTO
 * (aucune séparation wire/domaine). Ici, séparé comme le reste de la
 * plateforme : ce DTO est mappé vers `CurrentUser` (camelCase,
 * `@cmz/shared-domain`) par `current-user.mapper.ts`.
 */
export interface UserPermissionApiDto {
    id: number;
    level: number;
    title: string;
    label: string;
    code: string;
    head_code: string;
    icon: string;
    path?: string;
    type: string;
    active?: boolean;
    expanded?: boolean;
    statut?: boolean;
    children?: UserPermissionApiDto[];
}

export interface CurrentUserApiDto {
    id: number;
    last_name: string;
    first_name: string;
    email: string;
    profile: string;
    phone: string;
    is_admin: boolean;
    enable2fa: boolean;
    status: string;
    photo: string;
    permissions: UserPermissionApiDto[];
    paths: string[];
    actions: Record<string, string[]> | null;
}

export interface AuthTokenApiDto {
    value: string;
    expires_at: string;
}
