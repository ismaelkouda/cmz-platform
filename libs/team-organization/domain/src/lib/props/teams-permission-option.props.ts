/**
 * Permission aplatie — simplification actée (scope décidé avec
 * l'utilisateur : "CRUD complet, membres/perms différés") : le source
 * utilise un arbre PrimeNG récursif (`TreeNode`/`PermissionApiDto`
 * imbriqué) : ici on l'aplatit en liste de cases à cocher. Pas de
 * hiérarchie parent/enfant reconstruite — perte de fidélité assumée et
 * documentée, pas une omission accidentelle.
 */
export interface TeamsPermissionOption {
    value: string;
    label: string;
    checked: boolean;
}
