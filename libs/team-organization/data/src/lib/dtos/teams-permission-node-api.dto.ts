/**
 * Nœud d'arbre de permission tel que reçu du wire (PrimeNG `TreeNode`
 * enrichi côté source). Partagé entre `teams-find-one` (`permissions_json`,
 * état coché inclus) et `teams-permissions` (`get-permissions-model`,
 * arbre complet en mode création). Aplati en `TeamsPermissionOption[]` par
 * les mappers — cf. décision de simplification dans le domaine.
 */
export interface TeamsPermissionNodeApiDto {
    data: {
        value: string;
        title: string;
        checked?: boolean;
    };
    children?: TeamsPermissionNodeApiDto[];
}
