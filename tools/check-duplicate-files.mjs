#!/usr/bin/env node
/**
 * check-duplicate-files.mjs
 *
 * Audit F-4 / H-3 / P1-11 — détecte les fichiers source byte-identiques (MD5)
 * partagés entre modules sous `libs/`. Cible le motif form-mode / action-item
 * / vite.config : helper recopié au lieu d'être partagé.
 *
 * Contrainte déclarée dans les pattern.json (H-3) :
 *   constraints.no_cross_module_byte_identical_files
 *
 * Usage :
 *   bun run check:duplicates
 *   node tools/check-duplicate-files.mjs [--all-modules] [--module=<name>]
 *
 * Par défaut : uniquement les groupes **cross-module** (modules distincts
 * sous libs/<module>/…). `--all-modules` signale aussi les doublons internes
 * à un même module.
 * `--module=<name>` : ne signale que les groupes où ce module participe
 * (gate H-2 / émission corpus).
 *
 * Exit 1 si au moins un groupe est trouvé.
 *
 * ── Mode `--family` (audit O-1, audit-workspace-2026-08-02-revue-finale.md,
 * P1-25) ────────────────────────────────────────────────────────────────
 * Le mode par défaut compare des fichiers **byte-identiques** — il ne voit
 * jamais les 159 fichiers quasi-identiques de la famille `workflow-action`
 * (`processing`/`requests`/`finalization`/`report-states`) : un nom de
 * module différent à l'intérieur du fichier (imports, classes, chaînes)
 * suffit à casser le hash MD5. `--family` compare ces 4 modules **modulo
 * substitution du nom de module** (kebab/camel/Pascal/SNAKE) et
 * normalisation des commentaires/espaces — la méthode exacte de la mesure
 * P1-25 (539 fichiers analysés, 99 groupes, 159 redondants → 29,5 %).
 *
 *   node tools/check-duplicate-files.mjs --family [--record]
 *
 * `--record` écrit `docs/architecture/family-duplication-metrics.json`
 * (mesure datée, sur le modèle de `bundle-metrics.json`/ADR-0016). Sans
 * `--record`, le mode compare la mesure du jour au fichier existant et
 * échoue **seulement en cas de hausse** du taux de redondance (ADR-0020 —
 * l'isolation `scope:*` des 4 modules est un choix assumé, pas une dette à
 * zéro : bloquant à la hausse, jamais sur la valeur absolue actuelle).
 *
 * Contrainte déclarée dans le pattern.json gouvernant (H-4, audit O-6) :
 *   constraints.no_family_duplication_regression
 * (aujourd'hui : `docs/architecture/patterns/workflow-action.pattern.json`,
 * seul pattern dont `validated_on` recoupe `FAMILY_MODULES` — vérifié par
 * `assertFamilyPatternDeclaresConstraint`, pas supposé).
 */

import { createHash } from 'node:crypto';
import {
    existsSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIBS = join(ROOT, 'libs');
const PATTERNS_DIR = join(ROOT, 'docs/architecture/patterns');
const FAMILY_METRICS_FILE = join(
    ROOT,
    'docs/architecture/family-duplication-metrics.json'
);
const FAMILY_MODULES = [
    'processing',
    'requests',
    'finalization',
    'report-states',
];

const SOURCE_EXTS = new Set(['.ts', '.html', '.scss', '.css']);
const SKIP_DIRS = new Set([
    'node_modules',
    'dist',
    'out-tsc',
    '.git',
    '.angular',
]);
/** Ignore les stubs triviaux (barrels vides, re-exports d'une ligne). */
const MIN_BYTES = 40;

/**
 * Exception explicite et motivée — ADR-0003 §5d (2026-08-28).
 *
 * newsletter-angular et newsletter-react sont DEUX modules mono-stack
 * volontairement isolés (aucune dépendance croisée, scope:newsletter-angular
 * / scope:newsletter-react séparés dans eslint.config.mjs) implémentant le
 * MÊME contrat produit « subscribe-newsletter ». Les 4 fichiers ci-dessous
 * sont byte-identiques par nature de ce contrat, pas par copier-coller de
 * helper :
 *   - domain/models.ts, domain/validation.ts : le contrat d'API (types +
 *     règle de validation email) est un fait métier partagé, pas un
 *     utilitaire technique. Le remonter dans @cmz/shared-domain le
 *     rendrait visible/consommable par les 19 autres modules du repo qui
 *     n'en ont aucun usage — violation d'isolation plus grave que la
 *     duplication de 25 lignes qu'elle prétendrait éviter. Créer un 3e
 *     scope dédié casserait le pattern « un scope = un module mono-stack »
 *     établi par ADR-0003 §5d pour ce cas précis.
 *   - data/index.ts, application/lib/after-success.extension.ts : barrel
 *     technique et point d'extension volontairement vide par défaut
 *     (« human-owned, preserved during regeneration ») — identiques
 *     aujourd'hui par coïncidence de leur trivialité, destinés à diverger
 *     dès qu'une des deux plateformes personnalise son extension.
 *
 * Le motif que ce check cible (README du script : « helper recopié au lieu
 * d'être partagé », ex. form-mode/action-item/vite.config) ne s'applique
 * pas ici — ce n'est pas de la dette, c'est un contrat entre deux
 * implémentations isolées par design. Périmètre strictement borné à ces 4
 * chemins ; toute autre duplication cross-module reste bloquante.
 */
const CROSS_MODULE_ALLOWLIST = new Set([
    'libs/newsletter-angular/domain/src/lib/models.ts',
    'libs/newsletter-react/domain/src/lib/models.ts',
    'libs/newsletter-angular/domain/src/lib/validation.ts',
    'libs/newsletter-react/domain/src/lib/validation.ts',
    'libs/newsletter-angular/data/src/index.ts',
    'libs/newsletter-react/data/src/index.ts',
    'libs/newsletter-angular/application/src/lib/after-success.extension.ts',
    'libs/newsletter-react/application/src/lib/after-success.extension.ts',
]);

const CONSTRAINT_KEY = 'no_cross_module_byte_identical_files';
const FAMILY_CONSTRAINT_KEY = 'no_family_duplication_regression';

const reportIntraModule = process.argv.includes('--all-modules');
const moduleArg = process.argv.find((a) => a.startsWith('--module='));
const moduleIdx = process.argv.indexOf('--module');
const moduleFilter =
    moduleArg?.slice('--module='.length) ||
    (moduleIdx !== -1 ? process.argv[moduleIdx + 1] : undefined);

/**
 * H-3 — refuse d'exécuter le check si un pattern.json monorepo n'a pas la
 * contrainte (contrat machine pour la génération).
 */
function assertPatternsDeclareConstraint() {
    if (!existsSync(PATTERNS_DIR)) return;
    const files = readdirSync(PATTERNS_DIR).filter((f) =>
        f.endsWith('.pattern.json')
    );
    const missing = [];
    for (const file of files) {
        const abs = join(PATTERNS_DIR, file);
        try {
            const json = JSON.parse(readFileSync(abs, 'utf8'));
            if (!json?.constraints?.[CONSTRAINT_KEY]) {
                missing.push(file);
            }
        } catch {
            missing.push(`${file} (parse error)`);
        }
    }
    if (missing.length) {
        console.error(
            `FAIL check:duplicates — contrainte H-3 absente de pattern.json :\n` +
                missing.map((f) => `   ${f}`).join('\n')
        );
        console.error(
            `\nAttendu : constraints.${CONSTRAINT_KEY} (audit H-3 / prévention F-1/F-2).`
        );
        process.exit(1);
    }
}

/**
 * H-4 (O-6, revue finale 2026-08-02) — même discipline que H-3 mais scopée :
 * refuse d'exécuter `--family` si aucun pattern.json dont le `validated_on`
 * recoupe `FAMILY_MODULES` ne déclare la contrainte de non-régression
 * (`constraints.no_family_duplication_regression`). Contrairement à H-3
 * (exigée de TOUS les pattern.json, quelle que soit la famille), celle-ci
 * n'a de sens que pour les patterns qui gouvernent réellement des modules de
 * la famille — l'exiger de `crud-entity`/`read-only-view`/`action-request`
 * serait une contrainte vide de sens (aucun de leurs modules validés n'est
 * dans `FAMILY_MODULES`).
 */
function assertFamilyPatternDeclaresConstraint() {
    if (!existsSync(PATTERNS_DIR)) {
        console.error(
            `FAIL check:duplicates --family — ${relative(ROOT, PATTERNS_DIR)} absent, ` +
                `impossible de vérifier la contrainte H-4.`
        );
        process.exit(1);
    }
    const files = readdirSync(PATTERNS_DIR).filter((f) =>
        f.endsWith('.pattern.json')
    );
    const governingFamilyPatterns = [];
    for (const file of files) {
        const abs = join(PATTERNS_DIR, file);
        let json;
        try {
            json = JSON.parse(readFileSync(abs, 'utf8'));
        } catch {
            continue; // signalé par ailleurs par assertPatternsDeclareConstraint (H-3)
        }
        const validatedOn = Array.isArray(json?.validated_on)
            ? json.validated_on
            : [];
        if (validatedOn.some((m) => FAMILY_MODULES.includes(m))) {
            governingFamilyPatterns.push({ file, json });
        }
    }

    if (governingFamilyPatterns.length === 0) {
        console.error(
            `FAIL check:duplicates --family — aucun pattern.json ne référence ` +
                `l'un des FAMILY_MODULES (${FAMILY_MODULES.join(', ')}) dans son ` +
                `validated_on. La contrainte H-4 n'aurait nulle part où vivre — ` +
                `soit FAMILY_MODULES est désynchronisé des pattern.json réels, ` +
                `soit le pattern gouvernant a été renommé/supprimé sans mise à jour.`
        );
        process.exit(1);
    }

    const declaring = governingFamilyPatterns.filter(
        ({ json }) => json?.constraints?.[FAMILY_CONSTRAINT_KEY]
    );
    if (declaring.length === 0) {
        console.error(
            `FAIL check:duplicates --family — contrainte H-4 absente. ` +
                `${governingFamilyPatterns.length} pattern.json gouverne(nt) au moins ` +
                `un module de FAMILY_MODULES (${governingFamilyPatterns
                    .map((p) => p.file)
                    .join(', ')}) mais aucun ne déclare ` +
                `constraints.${FAMILY_CONSTRAINT_KEY}.`
        );
        console.error(
            `\nAttendu : constraints.${FAMILY_CONSTRAINT_KEY} (audit O-6 / H-4).`
        );
        process.exit(1);
    }
}

function walkSources(dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const abs = join(dir, entry.name);
        if (entry.isDirectory()) {
            walkSources(abs, out);
            continue;
        }
        if (!SOURCE_EXTS.has(extname(entry.name))) continue;
        out.push(abs);
    }
    return out;
}

/** `libs/<module>/…` → `<module>` (shared, core, report-states, …). */
function moduleOf(absPath) {
    const rel = relative(LIBS, absPath).split(/[/\\]/);
    return rel[0] || '';
}

function runByteIdenticalCheck() {
    assertPatternsDeclareConstraint();

    const byHash = new Map();

    for (const abs of walkSources(LIBS)) {
        const size = statSync(abs).size;
        if (size < MIN_BYTES) continue;
        const digest = createHash('md5')
            .update(readFileSync(abs))
            .digest('hex');
        let group = byHash.get(digest);
        if (!group) {
            group = [];
            byHash.set(digest, group);
        }
        group.push(abs);
    }

    const groups = [];

    for (const [digest, paths] of byHash) {
        if (paths.length < 2) continue;
        const modules = [...new Set(paths.map(moduleOf))].sort();
        const crossModule = modules.length > 1;
        if (!crossModule && !reportIntraModule) continue;
        if (moduleFilter && !modules.includes(moduleFilter)) continue;
        const relPaths = paths.map((p) => relative(ROOT, p)).sort();
        if (relPaths.every((p) => CROSS_MODULE_ALLOWLIST.has(p))) continue;
        groups.push({
            digest,
            crossModule,
            modules,
            paths: relPaths,
        });
    }

    groups.sort(
        (a, b) =>
            b.paths.length - a.paths.length ||
            a.paths[0].localeCompare(b.paths[0])
    );

    if (groups.length === 0) {
        const scope = moduleFilter
            ? `module « ${moduleFilter} »`
            : reportIntraModule
              ? 'libs/ (intra + cross)'
              : 'cross-module sous libs/';
        console.log(
            `OK  check:duplicates — aucun doublon byte-identique (${scope})`
        );
        process.exit(0);
    }

    console.error(
        `FAIL check:duplicates — ${groups.length} groupe(s) byte-identique(s) (MD5)` +
            (moduleFilter ? ` · module=${moduleFilter}` : '') +
            `\n`
    );

    for (const group of groups) {
        const kind = group.crossModule ? 'cross-module' : 'intra-module';
        console.error(
            `── ${kind} · md5=${group.digest} · modules=${group.modules.join(', ')}`
        );
        for (const p of group.paths) {
            console.error(`   ${p}`);
        }
        console.error('');
    }

    console.error(
        'Contrainte pattern H-3 / P1-11 : remonter dans @cmz/shared-* (ou tools/),' +
            ' supprimer les copies. Voir audit F-1 / F-2 / F-3 / F-7.'
    );
    process.exit(1);
}

// ── Mode --family (O-1, P1-25) ─────────────────────────────────────────────

/** `processing` → ['processing', 'processing' (camel==kebab), 'Processing', 'PROCESSING'] ; `report-states` → [.., 'reportStates', 'ReportStates', 'REPORT_STATES']. */
function moduleNameVariants(mod) {
    const camel = mod.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
    const upperSnake = mod.replace(/-/g, '_').toUpperCase();
    return [...new Set([mod, camel, pascal, upperSnake])];
}

/**
 * Neutralise, dans le contenu d'un fichier appartenant à `selfModule`, toute
 * occurrence du nom de **ce** module (les 4 casses) par un jeton canonique —
 * puis retire commentaires et espaces superflus. Deux fichiers qui ne
 * diffèrent que par le nom du module (et la mise en forme) normalisent vers
 * le même texte, donc vers le même hash.
 */
function normalizeForFamilyHash(content, selfModule) {
    let out = content;
    for (const variant of moduleNameVariants(selfModule)) {
        out = out.split(variant).join('__MODULE__');
    }
    out = out
        .replace(/\/\*[\s\S]*?\*\//g, '') // commentaires bloc
        .replace(/\/\/.*$/gm, '') // commentaires ligne
        .replace(/\s+/g, ' ') // espaces/retours à la ligne → 1 espace
        .trim();
    return out;
}

/** Sous-chemin après `libs/<module>/` — pour un rapport lisible, pas pour le regroupement (qui se fait par hash, comme le mode byte-identique). */
function subPathOf(absPath) {
    const rel = relative(LIBS, absPath).split(/[/\\]/);
    return rel.slice(1).join('/');
}

function runFamilyDuplicationCheck({ record }) {
    assertFamilyPatternDeclaresConstraint();

    const files = walkSources(LIBS).filter((abs) =>
        FAMILY_MODULES.includes(moduleOf(abs))
    );

    const byHash = new Map();
    for (const abs of files) {
        const mod = moduleOf(abs);
        const normalized = normalizeForFamilyHash(
            readFileSync(abs, 'utf8'),
            mod
        );
        if (normalized.length < MIN_BYTES) continue;
        const digest = createHash('md5').update(normalized).digest('hex');
        let group = byHash.get(digest);
        if (!group) {
            group = [];
            byHash.set(digest, group);
        }
        group.push(abs);
    }

    const groups = [];
    let redundant = 0;
    for (const [digest, paths] of byHash) {
        const modules = [...new Set(paths.map(moduleOf))];
        if (modules.length < 2) continue; // pas inter-module
        redundant += paths.length - 1;
        groups.push({
            digest,
            modules: modules.sort(),
            paths: paths.map((p) => relative(ROOT, p)).sort(),
            example: subPathOf(paths[0]),
        });
    }
    groups.sort((a, b) => b.paths.length - a.paths.length);

    const analyzed = files.length;
    const rate = analyzed > 0 ? redundant / analyzed : 0;

    const measurement = {
        measured_at: new Date().toISOString().slice(0, 10),
        modules: FAMILY_MODULES,
        files_analyzed: analyzed,
        cross_module_groups: groups.length,
        redundant_files: redundant,
        redundancy_rate: Number((rate * 100).toFixed(1)),
        method:
            'MD5 du contenu normalisé (nom du module propre substitué par ' +
            '__MODULE__ dans les 4 casses kebab/camel/Pascal/SNAKE, ' +
            'commentaires retirés, espaces normalisés) — audit O-1, P1-25.',
    };

    console.log(
        `check:duplicates --family — ${analyzed} fichiers analysés (${FAMILY_MODULES.join(', ')}), ` +
            `${groups.length} groupes inter-modules, ${redundant} fichiers redondants ` +
            `→ ${measurement.redundancy_rate} %`
    );

    if (record) {
        writeFileSync(
            FAMILY_METRICS_FILE,
            JSON.stringify(measurement, null, 2) + '\n',
            'utf8'
        );
        console.log(
            `✅ mesure enregistrée → ${relative(ROOT, FAMILY_METRICS_FILE)}`
        );
        process.exit(0);
    }

    if (!existsSync(FAMILY_METRICS_FILE)) {
        console.error(
            `FAIL check:duplicates --family — ${relative(ROOT, FAMILY_METRICS_FILE)} absent.\n` +
                `  Enregistrer une première mesure : node tools/check-duplicate-files.mjs --family --record`
        );
        process.exit(1);
    }

    const baseline = JSON.parse(readFileSync(FAMILY_METRICS_FILE, 'utf8'));

    // Bloquant à la hausse seulement (ADR-0020) — l'isolation scope:* des 4
    // modules est un choix assumé, la valeur absolue actuelle n'est pas une
    // dette à zéro. Tolérance 0,1 point pour éviter le bruit d'arrondi.
    if (measurement.redundancy_rate > baseline.redundancy_rate + 0.1) {
        console.error(
            `\nFAIL check:duplicates --family — régression : ${measurement.redundancy_rate} % ` +
                `> baseline ${baseline.redundancy_rate} % (${baseline.measured_at}).`
        );
        console.error(
            'ADR-0020 : la duplication de famille workflow-action est acceptée à sa valeur ' +
                'mesurée, pas illimitée — une hausse signale une nouvelle copie inter-module ' +
                'non factorisée à revoir avant merge (O-3/O-4), ou une mesure à ré-enregistrer ' +
                'sciemment (--record) si la hausse est un choix explicite.'
        );
        for (const g of groups.slice(0, 10)) {
            console.error(
                `  ── ${g.modules.length} modules · ~${g.example} · ${g.paths.length} copies`
            );
        }
        process.exit(1);
    }

    console.log(
        `OK  check:duplicates --family — ${measurement.redundancy_rate} % ` +
            `≤ baseline ${baseline.redundancy_rate} % (${baseline.measured_at})`
    );
    process.exit(0);
}

if (process.argv.includes('--family')) {
    runFamilyDuplicationCheck({ record: process.argv.includes('--record') });
} else {
    runByteIdenticalCheck();
}
