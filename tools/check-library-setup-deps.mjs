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
import { parse as parseJsoncSyntax, printParseErrorCode } from 'jsonc-parser';
import semver from 'semver';

export const DEP_FIELDS = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
];

/**
 * bun.lock est du JSONC (virgules traînantes). Parseur syntaxique réel — jamais
 * une regex qui pourrait altérer silencieusement une valeur de chaîne (ex.
 * `"catalog:,}"` → `"catalog:}"`). Toute erreur de syntaxe → exception.
 */
export function parseJsonc(raw, label = 'JSONC') {
    const errors = [];
    const value = parseJsoncSyntax(raw, errors, { allowTrailingComma: true });
    if (errors.length > 0) {
        const first = errors[0];
        throw new Error(
            `${label} : syntaxe invalide (${printParseErrorCode(first.error)} @ offset ${first.offset})`
        );
    }
    return value;
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
 * (ou est une version exacte). Analyse la forme normalisée par
 * `semver.validRange` — qui réécrit tout (`^`, `~`, `1.x`, `A - B`) en
 * comparateurs `>=`/`>`/`<=`/`<` — puis classe chaque comparateur. Aucune
 * valeur sentinelle. `*` (ou `x`) → non borné.
 * @param {string} normalizedRange sortie de `semver.validRange`
 */
export function catalogRangeIsBounded(normalizedRange) {
    if (
        typeof normalizedRange !== 'string' ||
        normalizedRange === '' ||
        normalizedRange === '*'
    ) {
        return false;
    }
    for (const branch of normalizedRange.split('||')) {
        const tokens = branch.trim().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return false;
        let hasLower = false;
        let hasUpper = false;
        for (const token of tokens) {
            if (token === '*') return false;
            const operator = /^(>=|<=|>|<)/.exec(token)?.[1] ?? '';
            if (operator === '') {
                hasLower = true; // comparateur nu = version exacte : deux bornes
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
    if (!catalogRangeIsBounded(range)) {
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
