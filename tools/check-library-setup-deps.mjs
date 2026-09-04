/**
 * check:library-setup — primitives de cohérence des dépendances gouvernées.
 * Extrait de check-library-setup.mjs (plafond 800 l.) ; fonctions pures,
 * testées directement par check-library-setup-apps.test.mjs.
 *
 * Contrat : une dépendance de bibliothèque gouvernée doit être `catalog:` dans
 * package.json racine, présente au catalog, et verrouillée dans bun.lock avec
 * la MÊME section, le MÊME spec, un record `[ "<name>@<version>", … ]` dont le
 * nom concorde, et une version qui satisfait la version/plage du catalog
 * (bornée). Tout écart → erreur (fail-closed).
 */
import {
    parse as parseJsoncSyntax,
    printParseErrorCode,
    visit as visitJsonc,
} from 'jsonc-parser';
import semver from 'semver';

export const DEP_FIELDS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
];

/**
 * Détecte les clés dupliquées dans TOUT objet du texte, à n'importe quelle
 * profondeur (`JSON.parse` comme `jsonc-parser` gardent silencieusement la
 * dernière — un `package.json` / `bun.lock` corrompu ou malveillant peut ainsi
 * masquer la vraie déclaration). Scope par objet : une même clé dans deux
 * éléments frères d'un tableau n'est PAS une duplication.
 * @returns {{ key: string, offset: number }[]}
 */
export function findDuplicateKeys(
    rawText,
    { allowTrailingComma = false } = {}
) {
    const found = [];
    const stack = [];
    visitJsonc(
        rawText,
        {
            onObjectBegin: () => stack.push(new Set()),
            onObjectProperty: (key, offset) => {
                const seen = stack[stack.length - 1];
                if (seen.has(key)) found.push({ key, offset });
                else seen.add(key);
            },
            onObjectEnd: () => stack.pop(),
        },
        { allowTrailingComma }
    );
    return found;
}

/**
 * Parse strictement, en ÉCHOUANT AVANT toute validation sémantique si :
 *   - un objet contient une clé dupliquée (récursif) ;
 *   - la syntaxe est invalide.
 * Sert pour package.json (`allowTrailingComma: false`) et bun.lock (`true`,
 * JSONC — jamais une regex qui altérerait une valeur de chaîne).
 */
export function parseWithoutDuplicateKeys(
    rawText,
    label,
    { allowTrailingComma = false } = {}
) {
    const duplicates = findDuplicateKeys(rawText, { allowTrailingComma });
    if (duplicates.length > 0) {
        throw new Error(
            `${label} : clé dupliquée "${duplicates[0].key}" (offset ${duplicates[0].offset})`
        );
    }
    const errors = [];
    const value = parseJsoncSyntax(rawText, errors, { allowTrailingComma });
    if (errors.length > 0) {
        const first = errors[0];
        throw new Error(
            `${label} : syntaxe invalide (${printParseErrorCode(first.error)} @ offset ${first.offset})`
        );
    }
    return value;
}

/** bun.lock : JSONC, clés dupliquées interdites. */
export function parseJsonc(raw, label = 'JSONC') {
    return parseWithoutDuplicateKeys(raw, label, { allowTrailingComma: true });
}

/** Sections de `container` (package.json / manifeste bun.lock) où `packageName` figure. */
export function declaringFields(container, packageName) {
    return DEP_FIELDS.filter(
        (field) =>
            container?.[field] && Object.hasOwn(container[field], packageName)
    );
}

/**
 * Extrait `{ name, version }` d'un record bun.lock v1 `[ "<name>@<version>", … ]`.
 * @returns {{ name: string, version: string } | { error: string }}
 */
export function parseLockRecord(packageName, lockRecord) {
    if (!Array.isArray(lockRecord) || typeof lockRecord[0] !== 'string') {
        return {
            error: `${packageName} : record bun.lock non conforme (attendu [ "<name>@<version>", … ])`,
        };
    }
    const identifier = lockRecord[0];
    const at = identifier.lastIndexOf('@');
    if (at <= 0) {
        return {
            error: `${packageName} : identifiant bun.lock "${identifier}" sans version`,
        };
    }
    return { name: identifier.slice(0, at), version: identifier.slice(at + 1) };
}

/**
 * Une valeur de catalog en plage est acceptable seulement si CHAQUE branche
 * `||` possède structurellement une borne inférieure ET une borne supérieure
 * (ou est une version exacte). Inspecte directement les objets `Comparator` de
 * `new semver.Range(value).set` — aucune re-tokenisation d'une chaîne, aucune
 * valeur sentinelle, robuste à la sérialisation interne de `semver`. Le
 * comparateur `ANY` (`*`) ou une plage semver ne fixe aucune borne (ex.
 * `>=0.0.0-0 <23` → semver simplifie en `<23`, donc non borné en bas).
 */
export function catalogRangeIsBounded(catalogValue) {
    let range;
    try {
        range = new semver.Range(catalogValue, { includePrerelease: true });
    } catch {
        return false;
    }
    if (range.set.length === 0) return false;
    for (const comparators of range.set) {
        let hasLower = false;
        let hasUpper = false;
        for (const comparator of comparators) {
            if (comparator.semver === semver.Comparator.ANY) return false;
            const operator = comparator.operator;
            if (operator === '') {
                hasLower = true; // comparateur exact : deux bornes
                hasUpper = true;
            } else if (operator === '>' || operator === '>=') {
                hasLower = true;
            } else if (operator === '<' || operator === '<=') {
                hasUpper = true;
            }
        }
        if (!hasLower || !hasUpper) return false;
    }
    return true;
}

/**
 * Cohérence version : la version résolue (record bun.lock) doit satisfaire la
 * valeur du catalog. Résolution SemVer réelle (`semver`) — pas de parseur
 * maison. Politique pré-release EXPLICITE : `includePrerelease: false`. Erreurs
 * (fail-closed) : record non conforme ou nommant un autre paquet ; version
 * résolue non parsable ; valeur de catalog non textuelle, vide, ni version ni
 * plage, ou plage non bornée.
 * @returns {string[]}
 */
export function verifyResolvedVersion(packageName, catalogValue, lockRecord) {
    const parsed = parseLockRecord(packageName, lockRecord);
    if (parsed.error) return [parsed.error];
    if (parsed.name !== packageName) {
        return [
            `${packageName} : record bun.lock nomme un autre paquet (${parsed.name})`,
        ];
    }
    const resolved = semver.valid(parsed.version);
    if (!resolved) {
        return [
            `${packageName} : version résolue "${parsed.version}" non parsable (bun.lock)`,
        ];
    }

    if (typeof catalogValue !== 'string' || catalogValue.trim() === '') {
        return [
            `${packageName} : valeur de catalog absente ou non textuelle (${typeof catalogValue})`,
        ];
    }
    const exact = semver.valid(catalogValue);
    if (exact) {
        return semver.eq(resolved, exact)
            ? []
            : [
                  `${packageName} : version résolue "${resolved}" ≠ catalog exact "${exact}" (bun.lock)`,
              ];
    }
    const range = semver.validRange(catalogValue);
    if (range === null) {
        return [
            `${packageName} : catalog "${catalogValue}" n'est ni une version ni une plage SemVer valide`,
        ];
    }
    if (!catalogRangeIsBounded(catalogValue)) {
        return [
            `${packageName} : catalog "${catalogValue}" est une plage non bornée — chaque branche doit avoir une borne basse ET haute (ou être exacte)`,
        ];
    }
    return semver.satisfies(resolved, range, { includePrerelease: false })
        ? []
        : [
              `${packageName} : version résolue "${resolved}" ne satisfait pas le catalog "${catalogValue}" (bun.lock)`,
          ];
}
