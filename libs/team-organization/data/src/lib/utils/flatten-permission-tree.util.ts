import { TeamsPermissionOption } from '@cmz/team-organization-domain';
import { TeamsPermissionNodeApiDto } from '../dtos/teams-permission-node-api.dto';

/**
 * Aplatit l'arbre de permissions récursif du wire (PrimeNG `TreeNode`) en
 * liste de cases à cocher — simplification actée avec l'utilisateur
 * ("CRUD complet, membres/perms différés"). La hiérarchie parent/enfant
 * est perdue ici, assumé et documenté (pas une omission accidentelle).
 */
export function flattenPermissionTree(
    nodes: TeamsPermissionNodeApiDto[] | undefined
): TeamsPermissionOption[] {
    if (!nodes?.length) {
        return [];
    }
    return nodes.flatMap((node) => [
        {
            value: node.data.value,
            label: node.data.title,
            checked: node.data.checked ?? false,
        },
        ...flattenPermissionTree(node.children),
    ]);
}
