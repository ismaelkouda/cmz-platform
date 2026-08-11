#!/usr/bin/env node
/**
 * check-pattern-nx-coverage.mjs
 *
 * T11-7 — « garder 100 % à chaque entité nouvelle » : `check-pattern-nx.mjs`
 * vérifie fidèlement la conformité d'UNE entité passée en argument, mais
 * rien ne garantissait que **toute** entité `crud-entity` du périmètre soit
 * effectivement passée un jour en argument. Constat en écrivant ce script :
 * `docs/architecture/scope.json` ne listait que 2 entités `coverage-areas`
 * (`mobile-network`, `site-group`) alors que `libs/coverage-areas/domain/
 * src/lib/entities/` en contient 4 réelles — `optical-fiber-network` et
 * `radio-relay-links` construites (formulaires, i18n, mappers) mais absentes
 * à la fois de `scope.json` ET de la commande `check:pattern-nx:crud-entity`
 * (`package.json`). Vérifié directement (`node tools/check-pattern-nx.mjs
 * libs/coverage-areas optical-fiber-network --schema
 * docs/architecture/patterns/crud-entity.pattern.json`) : 59/66 fichiers
 * (89.4 %), il manque les 7 fichiers de la variante `select` (repository/
 * DTO/mapper/repository-impl/api/use-case/facade) — jamais détecté car
 * jamais vérifié.
 *
 * Ce script comble l'angle mort : il croise `scope.json` (entités `class:
 * "crud-entity"`) avec la commande `check:pattern-nx:crud-entity` de
 * `package.json` (parsée, pas dupliquée à la main — une seule source pour
 * les deux) et échoue si une entité `crud-entity` du périmètre n'est
 * couverte par aucune invocation `check-pattern-nx.mjs`.
 *
 * MàJ (2026-08-11) — `optical-fiber-network`/`radio-relay-links` : la
 * variante `select` manquante (7 fichiers/entité) a été construite sans
 * `$SEOS_LEGACY_ROOT`, à partir de précédent 100 % in-repo, pas deviné :
 * (1) le champ wire du DTO `select` reprend celui déjà utilisé par la
 * réponse DTO **propre à l'entité**, déjà construite et vérifiée
 * (`OpticalFiberNetworkItemApiDto.name`, `RadioRelayLinksItemApiDto.name`),
 * confirmant la convention `name` plat de `SiteGroupSelectMapper` (pas la
 * variante `site_name` de `MobileNetworkSelectMapper`, non transposable
 * ici) ; (2) l'API `select` réutilise le même endpoint que la liste
 * principale de l'entité (`COVERAGE_AREAS_ENDPOINTS.OPTICAL_FIBER_NETWORK` /
 * `.RADIO_RELAY_LINKS`, déjà existants), comme `SiteGroupSelectApi` le fait
 * pour `SITE_GROUP`. Les deux entités sont désormais 66/66 (100 %) et
 * couvertes par `check:pattern-nx:crud-entity` — `KNOWN_GAPS` est vide ;
 * toute entité `crud-entity` manquante à l'avenir fait échouer ce script.
 *
 * Usage : bun run check:pattern-nx-coverage
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Écarts connus et justifiés — chaque entrée doit rester traçable vers une
 * investigation écrite. Retirer une entrée dès que l'entité est complétée
 * (variante `select` construite depuis la vraie forme legacy) ET ajoutée à
 * `check:pattern-nx:crud-entity` dans `package.json` — un script séparé
 * (celui-ci) le détectera de toute façon si l'entrée devient stale (elle
 * apparaîtrait alors comme "couverte" et ferait échouer la vérification
 * d'exception, cf. plus bas).
 */
const KNOWN_GAPS = new Map([]);

function loadScopeCrudEntities() {
    const scope = JSON.parse(
        readFileSync(join(ROOT, 'docs/architecture/scope.json'), 'utf8')
    );
    return (scope.entities ?? [])
        .filter((e) => e.class === 'crud-entity' && !e.out_of_scope)
        .map((e) => `${e.module}/${e.entity}`);
}

function loadCheckedEntities() {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const cmd = pkg.scripts?.['check:pattern-nx:crud-entity'];
    if (!cmd) {
        console.error(
            'Erreur : package.json ne déclare plus de script check:pattern-nx:crud-entity — ce script dépend de sa forme pour extraire les entités couvertes.'
        );
        process.exit(2);
    }
    // Extrait chaque paire "libs/<module> <entite>" qui suit
    // `check-pattern-nx.mjs` dans la commande chaînée par `&&`.
    const re = /check-pattern-nx\.mjs\s+libs\/(\S+)\s+(\S+)/g;
    const checked = new Set();
    let m;
    while ((m = re.exec(cmd))) {
        checked.add(`${m[1]}/${m[2]}`);
    }
    if (checked.size === 0) {
        console.error(
            'Erreur : aucune invocation check-pattern-nx.mjs trouvée dans check:pattern-nx:crud-entity — regex désynchronisée de la forme réelle de la commande ?'
        );
        process.exit(2);
    }
    return checked;
}

function main() {
    const scopeEntities = loadScopeCrudEntities();
    const checked = loadCheckedEntities();

    const uncovered = scopeEntities.filter((key) => !checked.has(key));
    const newGaps = uncovered.filter((key) => !KNOWN_GAPS.has(key));
    const staleAllowlist = [...KNOWN_GAPS.keys()].filter(
        (key) => !uncovered.includes(key)
    );

    console.log(
        `[check:pattern-nx-coverage] ${scopeEntities.length} entité(s) crud-entity dans scope.json, ${checked.size} couverte(s) par check:pattern-nx:crud-entity.`
    );

    let failed = false;

    if (newGaps.length > 0) {
        failed = true;
        console.error(
            '\n✖ Entité(s) crud-entity du périmètre jamais vérifiée(s) par check-pattern-nx.mjs (ni dans KNOWN_GAPS) :\n'
        );
        for (const key of newGaps) {
            console.error(`  ${key}`);
        }
        console.error(
            "\nAjouter l'entité à check:pattern-nx:crud-entity (package.json) si elle " +
                'est conforme, ou documenter une exception nominative justifiée dans ' +
                'KNOWN_GAPS (tools/check-pattern-nx-coverage.mjs) si elle ne peut pas ' +
                "l'être immédiatement (ex. contrat DTO à confirmer avant construction)."
        );
    }

    if (staleAllowlist.length > 0) {
        failed = true;
        console.error(
            "\n✖ Entrée(s) KNOWN_GAPS obsolète(s) — l'entité est maintenant couverte par check:pattern-nx:crud-entity, retirer l'entrée de tools/check-pattern-nx-coverage.mjs :\n"
        );
        for (const key of staleAllowlist) {
            console.error(`  ${key}`);
        }
    }

    if (failed) {
        process.exit(1);
    }

    if (KNOWN_GAPS.size > 0) {
        console.log(
            `\n✔ Aucune entité crud-entity non documentée. ${KNOWN_GAPS.size} exception(s) connue(s) et à jour :`
        );
        for (const [key, reason] of KNOWN_GAPS) {
            console.log(`  ${key} — ${reason}`);
        }
    } else {
        console.log(
            '\n✔ Toutes les entités crud-entity du périmètre sont couvertes.'
        );
    }
}

main();
