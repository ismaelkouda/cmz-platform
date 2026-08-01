#!/usr/bin/env node
/**
 * generate-status.mjs
 *
 * Génère STATUS.md à la racine du monorepo depuis l'état réel du code :
 * lit tous les project.json, regroupe les packages par module, et produit
 * un tableau Markdown à jour. Ne nécessite aucune mise à jour manuelle —
 * il suffit de relancer le script (ou de le déclencher en CI).
 *
 * Usage :
 *   node tools/generate-status.mjs
 *
 * ADR-0003 : chaque nouveau module doit avoir ses project.json conformes
 * avant que ce script le compte correctement.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LIBS = join(ROOT, 'libs');
const OUTPUT = join(ROOT, 'STATUS.md');
const SKIP = new Set(['node_modules', 'dist', 'out-tsc', '.git', '.angular']);

// ── Lecture des project.json ──────────────────────────────────────────────

function findProjectJsons(dir, acc = []) {
    for (const e of readdirSync(dir)) {
        if (SKIP.has(e)) continue;
        const full = join(dir, e);
        if (statSync(full).isDirectory()) findProjectJsons(full, acc);
        else if (e === 'project.json') acc.push(full);
    }
    return acc;
}

const files = findProjectJsons(LIBS);

// Regroupe par module (premier segment après libs/)
const moduleMap = new Map();
for (const f of files) {
    const rel = relative(LIBS, f); // ex: "report-states/domain/project.json"
    const [moduleName, layer] = rel.split('/');
    if (!moduleMap.has(moduleName)) moduleMap.set(moduleName, []);
    if (layer) moduleMap.get(moduleName).push(layer);
}

// ── Métadonnées de statut — à tenir à jour manuellement ──────────────────
// Structure : module → { status, notes }
// Les couches sont détectées automatiquement depuis les project.json.
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
        notes: 'Compilant — 4 embeds Grafana ; corpus 51 paires, 5 chaînes',
    },
    reporting: {
        status: '✅',
        family: 'read-only-view',
        notes: 'Compilant — 4 vues analytiques ; corpus 51 paires, 5 chaînes',
    },
    'interactive-map': {
        status: '⚠️',
        family: 'read-only-view',
        notes: 'IR partielle — visualization ✅, SIG hors scope ; corpus 28 paires, Meta documenté',
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
};

// ── Compte des fichiers TS par module ─────────────────────────────────────

function countTs(dir) {
    let count = 0;
    try {
        for (const e of readdirSync(dir)) {
            if (SKIP.has(e)) continue;
            const full = join(dir, e);
            if (statSync(full).isDirectory()) count += countTs(full);
            else if (e.endsWith('.ts') && !e.endsWith('.spec.ts')) count++;
        }
    } catch {
        /* dossier inexistant */
    }
    return count;
}

// ── Génération du Markdown ────────────────────────────────────────────────

const now = new Date().toISOString().slice(0, 10);
const totalTs = countTs(LIBS);
const totalPkg = files.length;

const rows = [...moduleMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mod, layers]) => {
        const meta = META[mod] ?? { status: '❓', family: '—', notes: '—' };
        const tsCount = countTs(join(LIBS, mod));
        const layerStr = layers.filter((l) => l !== 'project.json').join(', ');
        return `| \`${mod}\` | ${meta.status} | ${meta.family} | ${layerStr} | ${tsCount} | ${meta.notes} |`;
    });

const md = `# STATUS — cmz-platform

> **Généré automatiquement** par \`tools/generate-status.mjs\` le ${now}.
> Ne pas éditer manuellement — lancer \`node tools/generate-status.mjs\` pour régénérer.

## Résumé

| Indicateur | Valeur |
|:---|---:|
| Packages Nx (project.json) | **${totalPkg}** |
| Fichiers TypeScript dans libs/ | **${totalTs}** |
| Modules détectés | **${moduleMap.size}** |

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

| Module | Famille |
|:---|:---|

---
*[LLM_CONTEXT.md](./LLM_CONTEXT.md) — source de vérité architecture et directives agents IA*
`;

writeFileSync(OUTPUT, md, 'utf8');
console.log(
    `✅ STATUS.md généré — ${moduleMap.size} modules, ${totalPkg} packages, ${totalTs} fichiers .ts`
);
