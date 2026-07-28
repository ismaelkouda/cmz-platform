/**
 * Les 6 actions RBAC du source (`IProfilesPermissionActions`,
 * `PermissionAction` côté kernel) — toutes optionnelles (un nœud peut n'en
 * avoir qu'un sous-ensemble coché).
 */
export interface PermissionActions {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
    export?: boolean;
    delete?: boolean;
    approve?: boolean;
}

/**
 * Nœud de l'arbre de permissions — récursif, profondeur non bornée. `key`
 * identifie le nœud (sert de clé dans la map aplatie `{[key]: actions[]}`
 * envoyée en écriture, cf. `ProfilesPermissionsCreateContract.permissions`).
 * Reconstruit fidèlement le `PermissionApiDto`/`TreeNodeEntity` du source —
 * pas aplati en liste, contrairement à `TeamsPermissionOption`
 * (team-organization) : ce module a une vraie matrice nœud × action, pas une
 * simple checklist plate (décision actée, cf. AskUserQuestion).
 */
export interface PermissionTreeNode {
    key: string;
    label: string;
    checked: boolean;
    actions: PermissionActions;
    children: PermissionTreeNode[];
}
