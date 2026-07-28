import {
    PermissionActions,
    PermissionTreeNode,
} from '@cmz/settings-security-domain';

/**
 * Logique interactive de l'arbre de permissions (tri-state cascade +
 * aplatissement pour l'écriture) — délibérément portée par l'UI (pas le
 * domaine), cf. `permission-tree-node.props.ts` : le domaine ne porte que
 * la forme statique de l'arbre, la cascade/`flatten()` est une
 * responsabilité de présentation (même endroit que le
 * `PermissionTreeService` du source, dans `presentation/adapters/`).
 *
 * Simplification assumée par rapport au source : la cascade se propage
 * uniquement vers le bas (cocher/décocher un nœud coche/décoche tous ses
 * descendants et leurs actions). Il n'y a PAS de propagation ascendante
 * (état indéterminé du parent recalculé depuis ses enfants) — un parent
 * garde l'état que l'utilisateur lui a donné explicitement. Documenté ici
 * plutôt que ré-implémenté à l'identique du `PermissionTreeService`
 * source (tri-state complet ascendant+descendant), jugé hors du besoin
 * réel pour ce module (CRUD des profils, pas un éditeur RBAC avancé).
 */

function mapNode(
    nodes: PermissionTreeNode[],
    key: string,
    updater: (node: PermissionTreeNode) => PermissionTreeNode
): PermissionTreeNode[] {
    return nodes.map((node) => {
        if (node.key === key) {
            return updater(node);
        }
        if (node.children.length) {
            const children = mapNode(node.children, key, updater);
            if (children !== node.children) {
                return { ...node, children };
            }
        }
        return node;
    });
}

function setCheckedRecursive(
    node: PermissionTreeNode,
    checked: boolean
): PermissionTreeNode {
    const actions: PermissionActions = Object.fromEntries(
        Object.keys(node.actions).map((action) => [action, checked])
    );
    return {
        ...node,
        checked,
        actions,
        children: node.children.map((child) =>
            setCheckedRecursive(child, checked)
        ),
    };
}

/** Coche/décoche un nœud — cascade vers tous ses descendants (actions comprises). */
export function toggleNodeChecked(
    tree: PermissionTreeNode[],
    key: string
): PermissionTreeNode[] {
    return mapNode(tree, key, (node) =>
        setCheckedRecursive(node, !node.checked)
    );
}

/** Coche/décoche une action précise d'un nœud — recalcule `checked` (vrai si au moins une action est vraie). */
export function toggleNodeAction(
    tree: PermissionTreeNode[],
    key: string,
    action: string
): PermissionTreeNode[] {
    return mapNode(tree, key, (node) => {
        const actions: PermissionActions = {
            ...node.actions,
            [action]: !node.actions[action as keyof PermissionActions],
        };
        return {
            ...node,
            actions,
            checked: Object.values(actions).some(Boolean),
        };
    });
}

/**
 * Aplatit l'arbre en map plate `{[nodeKey]: actionName[]}` pour
 * l'écriture (`permissions?: Record<string, string[]>` des contrats
 * create/update) — passthrough sans transformation domaine, forme
 * distincte de la lecture (cf. décision domaine). Un nœud sans aucune
 * action vraie est omis.
 */
export function treeToPermissionsPayload(
    tree: PermissionTreeNode[]
): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    function walk(nodes: PermissionTreeNode[]): void {
        nodes.forEach((node) => {
            const granted = Object.entries(node.actions)
                .filter(([, value]) => value)
                .map(([action]) => action);
            if (granted.length) {
                result[node.key] = granted;
            }
            if (node.children.length) {
                walk(node.children);
            }
        });
    }

    walk(tree);
    return result;
}
