/**
 * Toute PR ouverte par Dependabot est assignée, dès son ouverture, à la
 * personne qui relit et fusionne (règle du propriétaire du 2026-11-23 :
 * « quand une PR est destinée au relecteur, l'assigner »). Mécanisme natif :
 * l'option `assignees` de chaque entrée `updates`, qui vaut aussi pour les
 * PR de sécurité. L'assigné doit avoir l'accès en écriture au dépôt.
 *
 * Le contrôle n'écrit aucun nom : il exige une liste non vide, de logins
 * GitHub valides, et la MÊME liste dans toutes les entrées. Une entrée
 * ajoutée sans assigné est donc refusée.
 */

// Forme d'un login GitHub : 1 à 39 caractères alphanumériques ou tirets,
// sans tiret au début, à la fin ni en double.
const GITHUB_LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

const entryName = (update, index) =>
    `updates[${index}] (${String(update?.['package-ecosystem'])} ${String(update?.directory)})`;

export function assigneePolicyErrors(config) {
    const updates = config?.updates;
    if (!Array.isArray(updates) || updates.length === 0) {
        return ['Dependabot : updates doit être une liste non vide'];
    }
    const errors = [];
    const signatures = new Map();
    updates.forEach((update, index) => {
        const name = entryName(update, index);
        const assignees = update?.assignees;
        if (!Array.isArray(assignees) || assignees.length === 0) {
            errors.push(`${name} : assignees doit être une liste non vide`);
            return;
        }
        const invalid = assignees.filter(
            (login) => typeof login !== 'string' || !GITHUB_LOGIN.test(login)
        );
        if (invalid.length > 0) {
            errors.push(
                `${name} : login GitHub invalide dans assignees (${invalid.map(String).join(', ')})`
            );
            return;
        }
        const signature = [...new Set(assignees)].sort().join(',');
        if (!signatures.has(signature)) signatures.set(signature, []);
        signatures.get(signature).push(name);
    });
    if (signatures.size > 1) {
        errors.push(
            `Dependabot : toutes les entrées doivent porter les mêmes assignees (${[
                ...signatures,
            ]
                .map(
                    ([signature, names]) => `${signature} : ${names.join(', ')}`
                )
                .join(' ; ')})`
        );
    }
    return errors;
}
