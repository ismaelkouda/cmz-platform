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
 * Ce script comble l'angle mort : il croise `scope.json` avec les commandes
 * `check:pattern-nx:*` de `package.json` (parsées, pas dupliquées à la main —
 * une seule source pour les deux) et échoue si une entité du périmètre n'est
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
 * couvertes par `check:pattern-nx:crud-entity`.
 *
 * MàJ (2026-08-14, T2-8 suite) — généralisé de « `crud-entity` seul » à
 * **toutes** les classes de `scope.json` qui ont une commande CI
 * `check:pattern-nx:<classe>` correspondante (crud-entity, workflow-action,
 * action-request, read-only-view — la Map `CLASS_TO_SCRIPT` ci-dessous est
 * l'unique point à éditer pour en ajouter une future). Deux catégories
 * d'écart légitime rencontrées en généralisant, chacune traitée
 * différemment :
 *   1. `out_of_scope: true` (ex. `seos-reference-action/sample-action`,
 *      fixture d'auto-test SEOS) — déjà exclu du dénominateur, même filtre
 *      que le reste de l'outillage (`check-pattern-nx-coverage` historique
 *      le faisait déjà pour crud-entity).
 *   2. Le sous-graphe `details` de `workflow-action` (4 entrées scope.json :
 *      `finalization/processing/requests/report-states` × `details`) —
 *      **jamais couvert par une invocation directe** `--set volet=details`,
 *      car ADR-0027/0028 modélisent ce sous-graphe comme 4 instances
 *      `transition` (`details`, `details_permissions`,
 *      `details_qualification`, `tasks_actions` — voir
 *      `workflow-action.pattern.json.composition`), pas comme un volet
 *      `collection` au même titre que `queues`/`tasks`/`all`. Ce n'est donc
 *      **pas un gap à combler par une future invocation `--set
 *      volet=details`** (ce volet n'existe pas dans le code réel — grep sur
 *      les 4 modules confirme l'absence de route/segment `details` en tant
 *      que volet de liste), mais une limite structurelle de la
 *      correspondance 1:1 `scope.json` entité ↔ invocation
 *      `check-pattern-nx.mjs` pour cette classe précise. Documenté
 *      nommément dans `STRUCTURAL_EXCEPTIONS`, pas dans `KNOWN_GAPS` (qui
 *      reste réservé aux vrais manques temporaires à combler).
 *
 * Usage : bun run check:pattern-nx-coverage
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Une entrée par classe `scope.json` ayant une commande CI dédiée. Ajouter
 * une classe ici est le seul geste nécessaire pour l'inclure dans l'audit de
 * couverture — pas de duplication de logique de parsing.
 */
const CLASS_TO_SCRIPT = new Map([
    ['crud-entity', 'check:pattern-nx:crud-entity'],
    ['workflow-action', 'check:pattern-nx:workflow-action'],
    ['action-request', 'check:pattern-nx:action-request'],
    ['read-only-view', 'check:pattern-nx:read-only-view'],
]);

/**
 * Écarts connus et justifiés (temporaires, à combler) — chaque entrée doit
 * rester traçable vers une investigation écrite. Retirer une entrée dès que
 * l'entité est complétée ET ajoutée au script `check:pattern-nx:<classe>`
 * correspondant dans `package.json` — ce script le détectera de toute façon
 * si l'entrée devient stale (elle apparaîtrait alors comme "couverte" et
 * ferait échouer la vérification d'exception, cf. plus bas).
 */
const KNOWN_GAPS = new Map([]);

/**
 * Écarts STRUCTURELS (permanents, pas des manques) — le sous-graphe
 * `scope.json` n'a et n'aura jamais de correspondance 1:1 avec une
 * invocation `check-pattern-nx.mjs libs/<module> <entité>`, car il est
 * couvert autrement (voir docstring ci-dessus). Contrairement à
 * `KNOWN_GAPS`, une entrée ici n'est PAS un signal qu'il faut ajouter une
 * invocation — c'est un signal qu'il ne faut PAS en ajouter une sous cette
 * forme.
 */
const STRUCTURAL_EXCEPTIONS = new Map([
    [
        'finalization/details',
        "Sous-graphe couvert par 4 instances transition (details/details_permissions/details_qualification/tasks_actions) dans workflow-action.pattern.json, pas par un volet --set volet=details (ce volet n'existe pas dans le code réel).",
    ],
    [
        'processing/details',
        'Même exception que finalization/details — même classe, même pattern.',
    ],
    [
        'requests/details',
        'Même exception que finalization/details — même classe, même pattern.',
    ],
    [
        'report-states/details',
        'Même exception que finalization/details — même classe, même pattern.',
    ],
]);

function loadScopeEntitiesByClass(targetClass) {
    const scope = JSON.parse(
        readFileSync(join(ROOT, 'docs/architecture/scope.json'), 'utf8')
    );
    return (scope.entities ?? [])
        .filter((e) => e.class === targetClass && !e.out_of_scope)
        .map((e) => `${e.module}/${e.entity}`);
}

function loadCheckedEntities(scriptName) {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const cmd = pkg.scripts?.[scriptName];
    if (!cmd) {
        console.error(
            `Erreur : package.json ne déclare plus de script ${scriptName} — ce script dépend de sa forme pour extraire les entités couvertes.`
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
            `Erreur : aucune invocation check-pattern-nx.mjs trouvée dans ${scriptName} — regex désynchronisée de la forme réelle de la commande ?`
        );
        process.exit(2);
    }
    return checked;
}

function auditClass(targetClass, scriptName) {
    const scopeEntities = loadScopeEntitiesByClass(targetClass);
    const checked = loadCheckedEntities(scriptName);

    const uncovered = scopeEntities.filter((key) => !checked.has(key));
    const structural = uncovered.filter((key) =>
        STRUCTURAL_EXCEPTIONS.has(key)
    );
    const remaining = uncovered.filter(
        (key) => !STRUCTURAL_EXCEPTIONS.has(key)
    );
    const newGaps = remaining.filter((key) => !KNOWN_GAPS.has(key));
    const staleAllowlist = [...KNOWN_GAPS.keys()].filter(
        (key) =>
            scopeEntities.includes(key) &&
            !remaining.includes(key) &&
            !structural.includes(key)
    );

    console.log(
        `[check:pattern-nx-coverage] ${targetClass} : ${scopeEntities.length} entité(s) dans scope.json, ${checked.size} couverte(s) par ${scriptName}${structural.length > 0 ? `, ${structural.length} exception(s) structurelle(s)` : ''}.`
    );

    let failed = false;

    if (newGaps.length > 0) {
        failed = true;
        console.error(
            `\n✖ Entité(s) ${targetClass} du périmètre jamais vérifiée(s) par check-pattern-nx.mjs (ni dans KNOWN_GAPS, ni dans STRUCTURAL_EXCEPTIONS) :\n`
        );
        for (const key of newGaps) {
            console.error(`  ${key}`);
        }
        console.error(
            `\nAjouter l'entité à ${scriptName} (package.json) si elle est conforme, ` +
                'documenter une exception nominative justifiée dans KNOWN_GAPS si elle ne ' +
                "peut pas l'être immédiatement, ou dans STRUCTURAL_EXCEPTIONS si elle ne " +
                'peut structurellement pas correspondre 1:1 à une invocation ' +
                '(tools/check-pattern-nx-coverage.mjs).'
        );
    }

    if (staleAllowlist.length > 0) {
        failed = true;
        console.error(
            `\n✖ Entrée(s) KNOWN_GAPS obsolète(s) pour ${targetClass} — l'entité est maintenant couverte par ${scriptName}, retirer l'entrée de tools/check-pattern-nx-coverage.mjs :\n`
        );
        for (const key of staleAllowlist) {
            console.error(`  ${key}`);
        }
    }

    return {
        failed,
        scopeCount: scopeEntities.length,
        structuralCount: structural.length,
    };
}

function main() {
    let anyFailed = false;
    let totalScope = 0;
    let totalStructural = 0;

    for (const [targetClass, scriptName] of CLASS_TO_SCRIPT) {
        const { failed, scopeCount, structuralCount } = auditClass(
            targetClass,
            scriptName
        );
        anyFailed = anyFailed || failed;
        totalScope += scopeCount;
        totalStructural += structuralCount;
    }

    if (anyFailed) {
        process.exit(1);
    }

    console.log(
        `\n✔ Toutes les entités du périmètre (${totalScope}, dont ${totalStructural} exception(s) structurelle(s) documentée(s)) sont couvertes par leur classe.`
    );
}

main();
