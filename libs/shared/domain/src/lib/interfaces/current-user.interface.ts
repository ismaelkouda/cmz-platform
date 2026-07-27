/**
 * Session utilisateur — posé en Phase 05 en anticipation du module
 * `authentication` (seul `login` produit un `CurrentUser`/`AuthToken` réels ;
 * `PermissionActionsService` et `SessionService` en sont déjà consommateurs).
 * Fidèle au wire du source (`shared/domain/interfaces/current-user.interface.ts`).
 */
export interface UserPermission {
    id: number;
    level: number;
    title: string;
    label: string;
    code: string;
    headCode: string;
    icon: string;
    path?: string;
    type: string;
    active?: boolean;
    expanded?: boolean;
    statut?: boolean;
    children?: UserPermission[];
}

export interface CurrentUser {
    id: number;
    lastName: string;
    firstName: string;
    email: string;
    profile: string;
    phone: string;
    isAdmin: boolean;
    enable2fa: boolean;
    status: string;
    photo: string;
    permissions: UserPermission[];
    paths: string[];
    actions: Record<string, string[]> | null;
}

export interface AuthToken {
    value: string;
    expiresAt: string;
}
