#!/usr/bin/env node
/**
 * T6-2 — inventaire de licences tierces automatisé (gate CI).
 *
 * Reproduit en continu la méthode manuelle documentée dans
 * `docs/architecture/licences-tierces.md` (jusqu'ici « à rejouer
 * manuellement avant chaque revue de dépendances majeure » — sans
 * automatisation, le document dérive silencieusement : `axe-core`
 * (MPL-2.0, devDependency ajoutée le 2026-08-04) n'y figurait plus depuis
 * son ajout, la dernière relecture manuelle datant du 2026-08-03).
 *
 * Deux gates distinctes, pas une seule :
 *   1. **Production** (`--production`, ce qui est réellement livré au
 *      navigateur) : doit être 100 % permissif, ZÉRO exception tolérée.
 *      Une licence copyleft ou inconnue ici est bloquante sans discussion
 *      possible — c'est du code exécuté chez l'utilisateur final.
 *   2. **Ensemble du dépôt** (production + outillage/tests) : permissif
 *      par défaut, mais quelques exceptions **documentées et nominatives**
 *      sont tolérées pour des paquets jamais bundlés/distribués (ex.
 *      `axe-core`, MPL-2.0, utilisé uniquement par la suite de tests a11y
 *      — T12-8). Toute licence non permissive ET non présente dans
 *      DEV_ONLY_EXCEPTIONS fait échouer le job : pas d'allowlist
 *      silencieuse, un nouveau paquet copyleft doit être une décision
 *      explicite (même principe que ALLOWLIST_LIGNES dans
 *      check-file-weight.mjs).
 *
 * `license-checker-rseidelsohn` n'est pas une dépendance déclarée de ce
 * dépôt (éviter de faire dériver `bun.lock` sans pouvoir le régénérer
 * localement) — récupéré via `npx` à une version pinée, même stratégie que
 * `GITLEAKS_VERSION` dans check-secrets.mjs.
 *
 * Usage :
 *   bun run check:licenses
 *
 * Env :
 *   LICENSE_CHECKER_VERSION  override du pin (défaut ci-dessous)
 */

import { execFileSync } from 'node:child_process';

const VERSION = process.env.LICENSE_CHECKER_VERSION ?? '4.3.0';

/** Licences permissives — aucune obligation au-delà de la notice de copyright. */
const PERMISSIVE = new Set([
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    '0BSD',
    'CC0-1.0',
    'Unlicense',
]);

/** Ce dépôt lui-même — cohérent avec `"private": true` (package.json). */
const OWN_PACKAGE = '@cmz/source@0.0.0';
const OWN_LICENSE = 'UNLICENSED';

/**
 * Exceptions nominatives pour du code jamais bundlé/distribué (tests,
 * outillage) — chaque entrée doit être justifiée en commentaire. Rejetée
 * automatiquement si le paquet apparaît un jour dans le set `--production`
 * (cf. `assertNoExceptionInProduction` ci-dessous) : une exception dev-only
 * qui migrerait en dépendance de production doit être re-décidée, pas
 * héritée silencieusement.
 */
const DEV_ONLY_EXCEPTIONS = new Map([
    // MPL-2.0 (copyleft faible, fichier par fichier) — devDependency de
    // test uniquement (T12-8, gate a11y), jamais importée dans
    // apps/backoffice-angular ni bundlée dans le livrable navigateur.
    ['axe-core', 'MPL-2.0'],
]);

function runLicenseChecker(extraArgs) {
    const raw = execFileSync(
        'npx',
        ['--yes', `license-checker-rseidelsohn@${VERSION}`, '--json', ...extraArgs],
        { encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 }
    );
    return JSON.parse(raw);
}

function nameOf(pkgKey) {
    // "@scope/pkg@1.2.3" ou "pkg@1.2.3" → nom sans version.
    const at = pkgKey.lastIndexOf('@');
    return pkgKey.slice(0, at);
}

function checkProduction(prodPackages) {
    const violations = [];
    for (const [pkgKey, info] of Object.entries(prodPackages)) {
        const licenses = String(info.licenses);
        if (pkgKey === OWN_PACKAGE && licenses === OWN_LICENSE) continue;
        if (PERMISSIVE.has(licenses)) continue;
        violations.push({ pkgKey, licenses, scope: 'production' });
    }
    return violations;
}

function checkFull(allPackages, prodPackageKeys) {
    const violations = [];
    for (const [pkgKey, info] of Object.entries(allPackages)) {
        const licenses = String(info.licenses);
        if (pkgKey === OWN_PACKAGE && licenses === OWN_LICENSE) continue;
        if (PERMISSIVE.has(licenses)) continue;

        const name = nameOf(pkgKey);
        const expected = DEV_ONLY_EXCEPTIONS.get(name);
        if (expected && expected === licenses) {
            // Exception dev-only valable seulement si le paquet n'est pas
            // aussi résolu côté production (sinon il finirait dans le
            // livrable navigateur sans que quiconque ait tranché).
            if (prodPackageKeys.has(pkgKey)) {
                violations.push({
                    pkgKey,
                    licenses,
                    scope: 'production (exception dev-only invalide ici)',
                });
            }
            continue;
        }

        violations.push({ pkgKey, licenses, scope: 'dépôt (dev+prod)' });
    }
    return violations;
}

function printSummary(allPackages) {
    const byLicense = new Map();
    for (const info of Object.values(allPackages)) {
        const lic = String(info.licenses);
        byLicense.set(lic, (byLicense.get(lic) ?? 0) + 1);
    }
    console.log(
        `[check:licenses] ${Object.keys(allPackages).length} paquet(s) résolu(s) :`
    );
    for (const [lic, count] of [...byLicense.entries()].sort()) {
        console.log(`  ${lic}: ${count}`);
    }
}

function main() {
    const prodPackages = runLicenseChecker(['--production']);
    const allPackages = runLicenseChecker([]);
    const prodPackageKeys = new Set(Object.keys(prodPackages));

    printSummary(allPackages);

    const violations = [
        ...checkProduction(prodPackages),
        ...checkFull(allPackages, prodPackageKeys),
    ];

    if (violations.length === 0) {
        console.log(
            '\n✔ Licences conformes (production 100 % permissive ; exceptions dev-only toutes documentées et à jour).'
        );
        process.exit(0);
    }

    console.error('\n✖ Licence(s) non conforme(s) :\n');
    // Dédoublonne (un paquet production apparaît aussi dans le set complet).
    const seen = new Set();
    for (const v of violations) {
        const key = `${v.pkgKey}|${v.scope}`;
        if (seen.has(key)) continue;
        seen.add(key);
        console.error(`  ${v.pkgKey} — ${v.licenses} (${v.scope})`);
    }
    console.error(
        '\nSi cette licence est réellement acceptable pour un usage dev-only ' +
            '(jamais bundlé/distribué) : ajouter une entrée commentée et ' +
            'justifiée à DEV_ONLY_EXCEPTIONS dans tools/check-licenses.mjs ' +
            '(revue de code, décision explicite) — jamais tolérée pour un ' +
            'paquet de production, jamais `git commit --no-verify`.'
    );
    process.exit(1);
}

main();
