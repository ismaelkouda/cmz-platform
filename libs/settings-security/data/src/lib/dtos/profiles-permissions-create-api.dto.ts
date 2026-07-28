/**
 * `permissions` est une map plate `{[nodeKey]: actionName[]}` en écriture
 * — forme distincte de l'arbre `PermissionApiDto[]` reçu en lecture, pas
 * de transformation domaine (passthrough), cf. décision actée.
 */
export interface ProfilesPermissionsCreateApiDto {
    name: string;
    description: string;
    permissions?: Record<string, string[]>;
}
