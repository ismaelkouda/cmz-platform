// CI #389 : contrat des listes rendues par les analyseurs installés (Angular,
// TypeScript). Une liste attendue absente ou d'un autre type arrête la
// grammaire avec un refus nommé : un repli silencieux sur une liste vide
// sauterait un contrôle si l'API de l'analyseur changeait. `null` n'est admis
// que là où le contrat de l'analyseur le documente (`nullable`).
export function parserList(value, what, { nullable = false } = {}) {
    if (Array.isArray(value)) return value;
    if (nullable && value === null) return [];
    throw new Error(`page grammar: parser contract changed (${what})`);
}
