import { PermissionActions } from '@cmz/settings-security-domain';

/** Clés i18n des 6 actions RBAC (cf. `PermissionActions` domaine) — présentation pure. */
export const PERMISSION_ACTION_LABEL: Record<keyof PermissionActions, string> =
    {
        read: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ACTION.READ',
        write: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ACTION.WRITE',
        execute: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ACTION.EXECUTE',
        export: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ACTION.EXPORT',
        delete: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ACTION.DELETE',
        approve: 'SETTINGS_SECURITY.PROFILES_PERMISSIONS.ACTION.APPROVE',
    };

/** Résout le libellé d'une action — clé connue sinon la clé brute (défensif, wire large `Record<string, boolean>`). */
export function permissionActionLabel(action: string): string {
    return (
        (PERMISSION_ACTION_LABEL as Record<string, string>)[action] ?? action
    );
}
