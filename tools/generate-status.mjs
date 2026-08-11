#!/usr/bin/env node
/**
 * generate-status.mjs
 *
 * Génère STATUS.md et injecte les blocs de chiffres dans :
 *   - README.md
 *   - LLM_CONTEXT.md (§5)
 *   - docs/architecture/etat-du-socle.md
 *
 * Marqueurs (audit E-4 / P1-9) :
 *   <!-- BEGIN:GENERATED:<id> -->
 *   …contenu généré…
 *   <!-- END:GENERATED:<id> -->
 *
 * Usage :
 *   node tools/generate-status.mjs
 *   bun run generate:status
 *
 * Enchaîne aussi generate-adr-index.mjs (audit E-6 / P1-16).
 * Lit apps/backoffice-angular/bundle-metrics.json (audit E-8) pour le bloc
 * bundle — mesurer via `bun run bundle:record` après build production.
 * Lit docs/architecture/scope.json (audit M-7, 2026-08-03) pour la colonne
 * périmètre « attendu vs livré » — hard-fail si un module attendu construit
 * n'a aucune trace dans libs/ (écart de périmètre non documenté).
 * Calcule la couverture réelle du corpus SEOS (audit N-4/N-6, 2026-08-03) —
 * fichiers libs/ couverts par ≥ 1 paire, et correspondances vs décisions
 * d'architecture (`status: "n/a"`) — pas une seule métrique « paires ».
 *
 * ADR-0003 : chaque nouveau module doit avoir ses project.json conformes
 * avant que ce script le compte correctement.
 */

import { execFileSync } from 'node:child_process';
import {
    existsSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LIBS = join(ROOT, 'libs');
const APPS = join(ROOT, 'apps');
const CORPUS = join(ROOT, 'corpus');
const SCOPE_JSON = join(ROOT, 'docs/architecture/scope.json');
const STATUS_OUT = join(ROOT, 'STATUS.md');
const BUNDLE_METRICS = join(
    ROOT,
    'apps/backoffice-angular/bundle-metrics.json'
);
const SKIP = new Set(['node_modules', 'dist', 'out-tsc', '.git', '.angular']);

/** Phase active — source unique pour les blocs générés (ADR-0013). */
const PHASE = {
    active: '08',
    label: 'génération depuis patterns',
    next: '09',
    nextLabel: 'vérification fonctionnelle',
};

// ── Lecture des project.json ──────────────────────────────────────────────

function findProjectJsons(dir, acc = []) {
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return acc;
    for (const e of readdirSync(dir)) {
        if (SKIP.has(e)) continue;
        const full = join(dir, e);
        if (statSync(full).isDirectory()) findProjectJsons(full, acc);
        else if (e === 'project.json') acc.push(full);
    }
    return acc;
}

const libProjects = findProjectJsons(LIBS);
const appProjects = findProjectJsons(APPS);

// Regroupe par module (premier segment après libs/)
const moduleMap = new Map();
for (const f of libProjects) {
    const rel = relative(LIBS, f); // ex: "report-states/domain/project.json"
    const [moduleName, layer] = rel.split('/');
    if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, []);
    if (layer) moduleMap.get(moduleName).push(layer);
}

// ── Métadonnées de statut — à tenir à jour manuellement ──────────────────
const META = {
    shared: {
        status: '✅',
        family: 'kernel',
        notes: 'Kernel transverse opérationnel',
    },
    core: {
        status: '✅',
        family: 'kernel',
        notes: "Tokens d'injection + intercepteurs",
    },
    'administrative-infrastructure': {
        status: '✅',
        family: 'crud-entity',
        notes: 'Compilant — 2 entités',
    },
    'administrative-boundary': {
        status: '✅',
        family: 'crud-entity',
        notes: 'Compilant — 3 entités + hiérarchie géo',
    },
    authentication: {
        status: '✅',
        family: 'action-request',
        notes: 'Compilant — login/forgot/reset',
    },
    'coverage-areas': {
        status: '✅',
        family: 'crud-entity',
        notes: 'Compilant — 4 entités',
    },
    'team-organization': {
        status: '✅',
        family: 'crud-entity',
        notes: 'Compilant — 2 entités',
    },
    'content-management': {
        status: '✅',
        family: 'crud-entity',
        notes: 'Compilant — 6 entités',
    },
    'settings-security': {
        status: '✅',
        family: 'crud-entity',
        notes: 'Compilant — 3 entités',
    },
    communication: {
        status: '✅',
        family: 'crud-entity',
        notes: 'Compilant — messagerie + notifications',
    },
    dashboard: {
        status: '✅',
        family: 'read-only-view',
        notes: 'Module IR clôturé — corpus 25 paires, Meta 12/12 ; aggregated_stats_view',
    },
    monitoring: {
        status: '✅',
        family: 'read-only-view',
        notes: 'Module IR clôturé (a posteriori 2026-08-04) — 4 embeds Grafana ; corpus 51 paires, 5 chaînes, Meta 12/12',
    },
    reporting: {
        status: '✅',
        family: 'read-only-view',
        notes: 'Module IR clôturé (a posteriori 2026-08-04) — 4 vues analytiques ; corpus 51 paires, 5 chaînes, Meta 12/12',
    },
    'interactive-map': {
        status: '✅',
        family: 'read-only-view',
        notes: 'Module IR clôturé — SIG v1 + Grafana ; corpus 28 paires, Meta 12/12 ; P2 clusters/tiles',
    },
    'report-states': {
        status: '✅',
        family: 'workflow-action',
        notes: 'Module IR clôturé — corpus 187 paires, 8 chaînes, Meta 12/12',
    },
    finalization: {
        status: '✅',
        family: 'workflow-action',
        notes: 'Module IR clôturé — corpus 126 paires, 6 chaînes, Meta 12/12',
    },
    processing: {
        status: '✅',
        family: 'workflow-action',
        notes: 'Module IR clôturé — corpus 156 paires, 7 chaînes, Meta 12/12',
    },
    requests: {
        status: '✅',
        family: 'workflow-action',
        notes: 'Module IR clôturé — corpus 157 paires, 8 chaînes, Meta 12/12',
    },
    'workflow-details': {
        status: '✅',
        family: 'kernel',
        notes:
            'ADR-0020 (Option B, POC 2026-08-11) — sous-graphe "details" ' +
            'partagé report-states/requests (domain uniquement, 1 seule ' +
            'couche) ; pas un module fonctionnel — kernel comme shared/core.',
    },
};

// ── Compteurs ─────────────────────────────────────────────────────────────

function countTs(dir, { includeSpec = false } = {}) {
    let count = 0;
    try {
        for (const e of readdirSync(dir)) {
            if (SKIP.has(e)) continue;
            const full = join(dir, e);
            if (statSync(full).isDirectory()) {
                count += countTs(full, { includeSpec });
            } else if (e.endsWith('.ts')) {
                const isSpec = e.endsWith('.spec.ts');
                if (includeSpec || !isSpec) count++;
            }
        }
    } catch {
        /* dossier inexistant */
    }
    return count;
}

function countSpecTs(dir) {
    let count = 0;
    try {
        for (const e of readdirSync(dir)) {
            if (SKIP.has(e)) continue;
            const full = join(dir, e);
            if (statSync(full).isDirectory()) count += countSpecTs(full);
            else if (e.endsWith('.spec.ts')) count++;
        }
    } catch {
        /* */
    }
    return count;
}

function countCorpusPairs() {
    try {
        let n = 0;
        let files = 0;
        for (const e of readdirSync(CORPUS)) {
            if (!e.endsWith('.pairs.jsonl')) continue;
            files++;
            const lines = readFileSync(join(CORPUS, e), 'utf8')
                .trim()
                .split('\n')
                .filter(Boolean);
            n += lines.length;
        }
        return { pairs: n, files };
    } catch {
        return { pairs: 0, files: 0 };
    }
}

// ── Périmètre (M-7/M-8, audit-workspace-2026-08-02-revue-finale.md) ───────
// docs/architecture/scope.json est la donnée : les 53 entités du dépôt
// source, avec les 2 entités métier confirmées absentes de libs/ annotées
// `expected_status` (team-organization/agents-performances, daily-goal —
// ADR-0018 statue sur leur sort) et la fixture SEOS annotée `out_of_scope`
// (seos-reference-action/sample-action, pas une entité applicative).
//
// Garde-fou mécanique réel, pas seulement déclaratif : toute entité du
// périmètre dont le **module** n'a aucune trace dans libs/ et qui n'est ni
// `out_of_scope` ni déjà `expected_status` fait échouer ce script — un vrai
// écart de périmètre non documenté, pas une liste qui dérive en silence.
function loadScope() {
    if (!existsSync(SCOPE_JSON)) {
        console.error(`FAIL  ${relative(ROOT, SCOPE_JSON)} absent — audit M-7`);
        process.exit(1);
    }
    const scope = JSON.parse(readFileSync(SCOPE_JSON, 'utf8'));
    const entities = scope.entities ?? [];
    const inScope = entities.filter((e) => !e.out_of_scope);
    const missing = inScope.filter((e) => e.expected_status);
    const built = inScope.filter((e) => !e.expected_status);
    for (const e of built) {
        if (!moduleMap.has(e.module)) {
            console.error(
                `FAIL  scope.json : ${e.module}/${e.entity} attendu construit mais ` +
                    `aucune trace de libs/${e.module} — écart de périmètre non documenté ` +
                    `(ajouter expected_status ou out_of_scope si volontaire)`
            );
            process.exit(1);
        }
    }
    return {
        total: entities.length,
        outOfScope: entities.length - inScope.length,
        inScope: inScope.length,
        built: built.length,
        missing,
    };
}

// ── Corpus — couverture réelle vs objectif scientifique (N-4/N-6, P0-12) ──
// `LLM_CONTEXT.md` §1.2 présente le corpus comme un jeu de données
// d'apprentissage ; mesuré ici tel qu'il est réellement (revue-finale
// 2026-08-02, P0-12) : un index de correspondances de chemins, à séparer
// explicitement des 194 entrées qui documentent une **absence** délibérée
// (`status: "n/a"`) plutôt qu'une correspondance.
function corpusCoverage() {
    let verified = 0;
    let notApplicable = 0;
    const nxPaths = new Set();
    try {
        for (const e of readdirSync(CORPUS)) {
            if (!e.endsWith('.pairs.jsonl')) continue;
            for (const line of readFileSync(join(CORPUS, e), 'utf8')
                .trim()
                .split('\n')
                .filter(Boolean)) {
                const pair = JSON.parse(line);
                if (pair.status === 'n/a') notApplicable++;
                else verified++;
                // Dénominateur STATUS.md = fichiers libs/ hors tests (totalTs) :
                // exclut les .spec.ts et les fichiers hors libs/ (ex.
                // apps/backoffice-angular/.../*.providers.ts) pour rester
                // comparable au même chiffre que "Fichiers TypeScript (libs/)".
                if (
                    pair.nx &&
                    pair.nx !== 'n/a' &&
                    pair.nx.startsWith('libs/') &&
                    !pair.nx.endsWith('.spec.ts')
                ) {
                    nxPaths.add(pair.nx);
                }
            }
        }
    } catch {
        /* corpus absent */
    }
    const modulesCovered = new Set(
        [...nxPaths].map((p) => p.split('/')[1]).filter(Boolean)
    );
    return {
        total: verified + notApplicable,
        verified,
        notApplicable,
        filesCovered: nxPaths.size,
        modulesCovered,
    };
}

// Découverte 2026-08-04 (cartographie des modules, onzième passe — « le
// livrable n'est pas l'application, c'est le corpus ») : le texte figé
// « 10 modules `crud-entity` sans aucune paire » (N-4) était imprécis —
// vérifié contre scope.json + META ci-dessus : sur les 10 modules Nx sans
// aucune paire corpus, seuls 7 sont réellement de famille `crud-entity`
// (administrative-boundary, administrative-infrastructure, communication,
// content-management, coverage-areas, settings-security,
// team-organization) ; les 3 autres sont `shared`/`core` (kernel, hors
// périmètre corpus par construction — pas de contrepartie legacy à
// comparer) et `authentication` (action-request). Calculé dynamiquement
// ci-dessous plutôt que réécrit à la main, pour ne plus pouvoir dériver du
// réel silencieusement.
function modulesWithoutCorpus(modulesCovered) {
    const without = [...moduleMap.keys()].filter((m) => !modulesCovered.has(m));
    const byFamily = {};
    for (const m of without) {
        const fam = META[m]?.family ?? 'inconnue';
        byFamily[fam] = (byFamily[fam] ?? 0) + 1;
    }
    const detail = Object.entries(byFamily)
        .sort(([, a], [, b]) => b - a)
        .map(([fam, n]) => `${n} \`${fam}\``)
        .join(', ');
    return { count: without.length, modules: without, detail };
}

function familyClosed(family) {
    const mods = [...moduleMap.keys()].filter(
        (m) => META[m]?.family === family && META[m]?.status === '✅'
    );
    return mods.length;
}

function fmt(n) {
    return Number(n).toLocaleString('fr-FR');
}

// STATUS_DATE : fige la date (CI freshness E-5). Défaut = jour UTC courant.
const now =
    process.env.STATUS_DATE?.trim() || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(now)) {
    console.error(
        'FAIL  STATUS_DATE invalide (attendu YYYY-MM-DD) : ' +
            process.env.STATUS_DATE
    );
    process.exit(1);
}
const totalLibPkg = libProjects.length;
const totalAppPkg = appProjects.length;
const totalNxProjects = totalLibPkg + totalAppPkg;
const totalTs = countTs(LIBS);
const totalSpec = countSpecTs(LIBS);
const totalTsWithSpec = totalTs + totalSpec;
const moduleCount = moduleMap.size;
const workflowClosed = familyClosed('workflow-action');
const readOnlyClosed = familyClosed('read-only-view');
const corpus = countCorpusPairs();
const scope = loadScope();
const corpusDetail = corpusCoverage();
const corpusCoveragePct =
    totalTs > 0
        ? ((corpusDetail.filesCovered / totalTs) * 100).toFixed(1)
        : '0.0';
const withoutCorpus = modulesWithoutCorpus(corpusDetail.modulesCovered);

const stats = {
    now,
    phase: PHASE,
    moduleCount,
    totalLibPkg,
    totalAppPkg,
    totalNxProjects,
    totalTs,
    totalSpec,
    totalTsWithSpec,
    workflowClosed,
    readOnlyClosed,
    corpus,
};

// ── STATUS.md ─────────────────────────────────────────────────────────────

const rows = [...moduleMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mod, layers]) => {
        const meta = META[mod] ?? { status: '❓', family: '—', notes: '—' };
        const tsCount = countTs(join(LIBS, mod));
        const layerStr = layers.filter((l) => l !== 'project.json').join(', ');
        return `| \`${mod}\` | ${meta.status} | ${meta.family} | ${layerStr} | ${tsCount} | ${meta.notes} |`;
    });

const statusMd = `# STATUS — cmz-platform

> **Généré automatiquement** par \`tools/generate-status.mjs\` le ${now}.
> Ne pas éditer manuellement — lancer \`node tools/generate-status.mjs\` pour régénérer.

## Résumé

| Indicateur | Valeur |
|:---|---:|
| Packages Nx | **${totalLibPkg} libs + ${totalAppPkg} app** (${totalNxProjects} \`project.json\`) |
| Fichiers TypeScript (\`libs/\`) | **${fmt(totalTs)} fichiers hors tests** (${fmt(totalTsWithSpec)} au total, dont ${fmt(totalSpec)} specs) |
| Modules détectés | **${moduleCount}** |
| Périmètre applicatif (\`scope.json\`, M-7) | **${scope.built} / ${scope.inScope} entités construites** (${scope.outOfScope} fixture SEOS hors périmètre) — [détail](./docs/architecture/scope.json) |
| Corpus SEOS — couverture fichiers (N-4) | **${corpusDetail.filesCovered} / ${fmt(totalTs)} fichiers libs/ hors tests → ${corpusCoveragePct} %** — ${withoutCorpus.count} modules sans aucune paire (${withoutCorpus.detail}) |
| Corpus SEOS — nature des paires (N-6) | **${corpusDetail.verified} correspondances** + **${corpusDetail.notApplicable} décisions d'architecture** (\`status: n/a\`) — pas ${corpusDetail.total} paires d'apprentissage |

## Légende

| Symbole | Signification |
|:---:|:---|
| ✅ | Compilant, livré |
| ⚠️ | Partiel ou incomplet |
| 🔧 | En cours de reconstruction |
| ❌ | Non commencé |
| ❓ | Statut inconnu |

## Détail par module

| Module | Statut | Famille | Couches | Fichiers .ts | Notes |
|:---|:---:|:---|:---|---:|:---|
${rows.join('\n')}

## Modules non commencés (attendus)

Calculé depuis l'écart entre \`docs/architecture/scope.json\` (périmètre
déclaré, 53 entités) et une trace réelle dans \`libs/\` — pas une liste tenue à
la main (M-7/L-2/L-3, \`audit-workspace-2026-08-02-addendum.md\` P1-19).

| Module | Entité | Famille | Fichiers source (legacy) | Statut |
|:---|:---|:---|---:|:---|
${
    scope.missing.length > 0
        ? scope.missing
              .map(
                  (e) =>
                      `| \`${e.module}\` | \`${e.entity}\` | ${e.class} | ${e.source_files ?? '—'} | ${e.expected_status} |`
              )
              .join('\n')
        : '| — | — | — | — | Aucun écart — les 52 entités du périmètre (hors fixture SEOS) ont une trace dans libs/ |'
}

---
*[LLM_CONTEXT.md](./LLM_CONTEXT.md) — source de vérité architecture et directives agents IA*
`;

writeFileSync(STATUS_OUT, statusMd, 'utf8');

// ── Injection marqueurs BEGIN:GENERATED ───────────────────────────────────

/**
 * @param {string} filePath
 * @param {string} blockId
 * @param {string} body
 */
function upsertGeneratedBlock(filePath, blockId, body) {
    const begin = `<!-- BEGIN:GENERATED:${blockId} -->`;
    const end = `<!-- END:GENERATED:${blockId} -->`;
    const block = `${begin}\n${body.trimEnd()}\n${end}`;
    let src = readFileSync(filePath, 'utf8');
    const re = new RegExp(
        `<!-- BEGIN:GENERATED:${blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->[\\s\\S]*?<!-- END:GENERATED:${blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} -->`
    );
    if (!re.test(src)) {
        console.error(
            `FAIL  marqueur manquant dans ${relative(ROOT, filePath)} : ${blockId}`
        );
        console.error(`  Attendu : ${begin} … ${end}`);
        process.exit(1);
    }
    src = src.replace(re, () => block);
    writeFileSync(filePath, src, 'utf8');
    console.log(`✅ bloc ${blockId} → ${relative(ROOT, filePath)}`);
}

/** @returns {{ initial_raw_kb: number; exceljs_lazy_raw_kb: number | null; measured_at: string; budget_initial_warning: string | null; budget_initial_error: string | null }} */
function loadBundleMetrics() {
    if (!existsSync(BUNDLE_METRICS)) {
        console.error(
            'FAIL  apps/backoffice-angular/bundle-metrics.json absent — audit E-8'
        );
        console.error(
            '  bunx nx run backoffice-angular:build:production && bun run bundle:record'
        );
        process.exit(1);
    }
    return JSON.parse(readFileSync(BUNDLE_METRICS, 'utf8'));
}

const bundle = loadBundleMetrics();

const readmeBlock = `**État au ${now} :** Phase **${PHASE.active}** (${PHASE.label}) — **${moduleCount}** modules, **${totalLibPkg}** libs + **${totalAppPkg}** app, **${fmt(totalTs)}** fichiers \`.ts\` hors tests. Bundle initial prod **${bundle.initial_raw_kb} kB**. Voir [\`STATUS.md\`](./STATUS.md).`;

const llmBlock = `| Indicateur                | Valeur                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Dernière génération       | **${now}** (\`bun run generate:status\`)                                                                      |
| Modules livrés            | **${moduleCount}** (voir [\`STATUS.md\`](./STATUS.md))                                                         |
| Packages Nx               | **${totalNxProjects}** (${totalLibPkg} libs + ${totalAppPkg} app)                                              |
| Fichiers TypeScript       | **${fmt(totalTs)}** hors tests / **${fmt(totalTsWithSpec)}** total (${fmt(totalSpec)} specs)                 |
| Corpus SEOS               | **${fmt(corpus.pairs)}** paires / **${corpus.files}** modules (\`corpus/*.pairs.jsonl\`)                       |
| Corpus SEOS — nature (N-6)| **${corpusDetail.verified} correspondances** + **${corpusDetail.notApplicable} décisions d'architecture** (\`n/a\`) — pas ${corpusDetail.total} paires d'apprentissage (P0-12) |
| Corpus SEOS — couverture (N-4) | **${corpusDetail.filesCovered} / ${fmt(totalTs)} fichiers libs/ hors tests → ${corpusCoveragePct} %** — ${withoutCorpus.count} modules sans aucune paire (${withoutCorpus.detail}), absent sans ce chiffre (P0-12) |
| Périmètre applicatif (M-7)| **${scope.built} / ${scope.inScope} entités** construites (\`docs/architecture/scope.json\`, ${scope.missing.length} manquantes — voir [ADR-0018](./docs/adr/0018-perimetre-team-organization.md)) |
| Bundle initial (prod, raw)| **${bundle.initial_raw_kb} kB** ([\`bundle-metrics.json\`](./apps/backoffice-angular/bundle-metrics.json), ${bundle.measured_at}) |
| Famille \`workflow-action\` | **${workflowClosed}/4 IR clôturés** — corpus + Meta 12/12 par module                                         |
| Famille \`read-only-view\`  | **${readOnlyClosed}/4 IR clôturés** — \`monitoring\`, \`reporting\`, \`dashboard\`, \`interactive-map\`              |
| Phase active              | **${PHASE.active}** — ${PHASE.label} ([ADR-0013](./docs/adr/0013-phases-08-generation-et-09-verification.md) ; Phase ${PHASE.next} = ${PHASE.nextLabel}) |
| Oracle obligatoire        | build + eslint + strictTemplates + corpus \`--verify\` pour clôture module                                     |
| Oracle Tier 2 (nightly)   | \`bun run check:tier2\` — ngc + build development + build production                                           |`;

const etatBlock = `- **Dernière mise à jour :** ${now} (généré par \`tools/generate-status.mjs\`)
- **État :** **Phase ${PHASE.active}** — ${PHASE.label} ([ADR-0013](../adr/0013-phases-08-generation-et-09-verification.md)). Socle outillé + Kernel \`shared/\` / \`@cmz/core\` + **${moduleCount}** modules livrés/compilants (**${totalLibPkg}** libs + **${totalAppPkg}** app ; **${fmt(totalTs)}** \`.ts\` hors tests). Voir [\`STATUS.md\`](../../STATUS.md).
- **Familles IR :** \`workflow-action\` **${workflowClosed}/4**, \`read-only-view\` **${readOnlyClosed}/4**. Corpus **${fmt(corpus.pairs)}** paires. CI \`corpus:ci\` (structural-only) + \`corpus-full\` (main) + Tier 2 nightly.`;

const bundleBlock = [
    `- **Bundle initial (production, raw)** : **${bundle.initial_raw_kb} kB** — source [\`bundle-metrics.json\`](../../apps/backoffice-angular/bundle-metrics.json) (mesuré ${bundle.measured_at} via \`bun run bundle:record\` après build).`,
    bundle.exceljs_lazy_raw_kb != null
        ? `- **ExcelJS (lazy)** : **${bundle.exceljs_lazy_raw_kb} kB** raw — hors budget initial.`
        : null,
    `- **Budgets** (\`project.json\`) : warning \`${bundle.budget_initial_warning ?? '?'}\` / error \`${bundle.budget_initial_error ?? '?'}\` — politique [ADR-0016](../adr/0016-politique-budget-bundle.md) (hausse interdite sans ADR).`,
]
    .filter(Boolean)
    .join('\n');

upsertGeneratedBlock(join(ROOT, 'README.md'), 'monorepo-status', readmeBlock);
upsertGeneratedBlock(join(ROOT, 'LLM_CONTEXT.md'), 'monorepo-status', llmBlock);
upsertGeneratedBlock(
    join(ROOT, 'docs/architecture/etat-du-socle.md'),
    'monorepo-status',
    etatBlock
);
upsertGeneratedBlock(
    join(ROOT, 'docs/architecture/etat-du-socle.md'),
    'bundle-metrics',
    bundleBlock
);

console.log(
    `✅ STATUS.md — ${moduleCount} modules, ${totalNxProjects} packages Nx, ${fmt(totalTs)} fichiers .ts hors tests`
);
console.log(
    `   stats:`,
    JSON.stringify(
        {
            date: stats.now,
            modules: stats.moduleCount,
            libs: stats.totalLibPkg,
            apps: stats.totalAppPkg,
            ts: stats.totalTs,
            specs: stats.totalSpec,
            corpusPairs: stats.corpus.pairs,
            phase: stats.phase.active,
        },
        null,
        0
    )
);

// Audit E-6 — index ADR (docs/adr/README.md + docs/README.md)
try {
    execFileSync(
        process.execPath,
        [join(ROOT, 'tools/generate-adr-index.mjs')],
        {
            cwd: ROOT,
            stdio: 'inherit',
        }
    );
} catch {
    console.error('FAIL  generate-adr-index.mjs a échoué');
    process.exit(1);
}
