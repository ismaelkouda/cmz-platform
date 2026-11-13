// CI #389 : gardes fermées de la composition de page, partagées par les profils
// interne et extérieur. Une donnée attendue absente arrête le rendu avec un
// refus nommé ; aucun repli silencieux sur une liste vide.

// Permissions d'un nœud en mode `required` : un tableau vide rendrait
// `every()` vrai, donc l'action autorisée sans permission.
export function requiredPermissions(node) {
    const permissions = node.authorization.permissions;
    if (
        !Array.isArray(permissions) ||
        permissions.length === 0 ||
        permissions.some(
            (permission) => typeof permission !== 'string' || !permission
        )
    )
        throw new Error(
            `page composition: ${node.id} authorization required without permissions`
        );
    return permissions;
}

// Effets de session du plan : aucun sans session ; une session les déclare
// toujours (schéma du plan d'exécution).
export function sessionEffects(plan) {
    if (plan.session === undefined) return [];
    if (!Array.isArray(plan.session?.effects))
        throw new Error('page composition: session without declared effects');
    return plan.session.effects;
}
