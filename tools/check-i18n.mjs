#!/usr/bin/env node
/**
 * check:i18n — chantier K (P0-9, audit-workspace-2026-08-02-addendum.md).
 *
 * Constat d'origine : 379 clés i18n référencées dans `libs/` mais absentes
 * de `fr.translation.ts` — chaque erreur de validation de formulaire affiche
 * alors la clé technique brute plutôt qu'un message. K-1 demandait ce script
 * (« clé référencée sans définition = échec ; clé définie sans usage =
 * avertissement »), K-3 demandait de trier les faux positifs de la regex
 * d'origine.
 *
 * Méthode, pour rester fidèle au constat d'origine tout en réduisant ses
 * faux positifs connus :
 *   1. Clés définies : `FR` (apps/backoffice-angular/src/app/i18n/
 *      fr.translation.ts) est transpilé (TypeScript API, pas d'`eval` sur du
 *      texte non validé) puis importé réellement — flatten en chemins
 *      pointés (feuilles `string` uniquement).
 *   2. Clés référencées, dans tout `.ts` sous `apps/`/`libs/` (hors
 *      node_modules) :
 *      a. littéraux directs `'X.Y.Z'` / `` `X.Y.Z` `` (regex restreinte à
 *         des segments MAJUSCULES_ET_UNDERSCORE — réduit drastiquement les
 *         faux positifs par rapport à la regex d'origine `[A-Z_]+(\.[A-Z0-9_]+)+`
 *         qui captait aussi des constantes non-i18n) ;
 *      b. le motif `const T = 'PREFIX'` + `` `${T}.SUFFIX` `` (304 usages
 *         mesurés dans ce dépôt, ex. `report-page.component.ts`) — sans
 *         cette résolution, ce motif produirait des centaines de faux
 *         positifs "clé manquante" (la regex ne voit que `.SUFFIX`, jamais
 *         le préfixe réel).
 *   3. Rapport : référencées-mais-non-définies = **échec** (exit 1) ;
 *      définies-mais-jamais-référencées = avertissement (exit 0).
 *
 * Réserve de méthode assumée, comme dans l'audit d'origine : une regex ne
 * remplace pas un AST complet sur les usages (seule la définition est
 * parsée en AST réel). Des faux positifs résiduels sont possibles ; à
 * trier au cas par cas (K-3), pas en bloquant toute la CI dès le premier
 * lancement — voir --warn-only.
 *
 * K-3 (triage réel, 2026-08-03) : troisième faux positif trouvé et corrigé
 * en vérifiant les 313 clés une par une avant de les traiter comme vraies —
 * `I18N.KEY` dans `libs/shared/ui/src/lib/components/filter/filter.types.ts`
 * était un exemple de valeur dans un commentaire JSDoc
 * (`` `{ [code]: 'I18N.KEY' }` ``), pas un usage réel. Corrigé en retirant
 * les commentaires (blocs `/* *\/` et lignes `//`) du contenu avant d'y
 * chercher des clés — mêmes regex qu'avant, appliquées à un texte qui ne
 * contient plus de commentaires.
 *
 * Quatrième correctif, même triage : `finalization-details-dialog.
 * component.ts`, `processing-details-dialog.component.ts` et
 * `tasks-actions-processing-form-dialog.component.ts` déclarent leur
 * préfixe comme **champ de classe** (`protected readonly T = 'PREFIX'`,
 * pas `const T = '...'`) et le composent par **concaténation**
 * (`t(T + '.SUFFIX')`, y compris `this.T + '.SUFFIX'` dans le template
 * inline), pas par template literal `` `${T}.SUFFIX` ``. Sans ce correctif :
 * `FINALIZATION.DETAILS`/`PROCESSING.DETAILS`/`PROCESSING.TASKS.ACTIONS`
 * remontaient comme clés manquantes (faux positif — ce sont des préfixes,
 * jamais résolus seuls) et une quinzaine d'usages réels (`.UNIQ_ID`,
 * `.REPORT_TYPE`, `.DIALOG.FORM.TYPE`, etc.) n'étaient jamais vus du tout
 * (faux négatif silencieux, plus trompeur qu'un faux positif visible).
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { globSync } from 'node:fs';
import ts from 'typescript';

const ROOT = new URL('..', import.meta.url).pathname;
const TRANSLATION_FILE = join(
    ROOT,
    'apps/backoffice-angular/src/app/i18n/fr.translation.ts'
);
const SCAN_GLOBS = ['apps/**/*.ts', 'libs/**/*.ts'];
const EXCLUDE_SEGMENTS = ['node_modules', '.spec.ts', '.test.ts'];

const KEY_SEGMENT = '[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*';
// Exige des guillemets autour de la clé — sans ça, `ACCESS_LOGS_FILTER_KEYS.ACTION`
// (accès de propriété TS sur une constante, pas une clé i18n) matchait aussi bien
// que `'COMMON.RETRY'` : faux positif réel, trouvé en vérifiant un cas avant de
// faire confiance à la regex (même réserve de méthode que l'audit d'origine,
// mais celui-ci corrigé plutôt que seulement noté).
const FLAT_KEY_RE = new RegExp(
    `['"\`](${KEY_SEGMENT}(?:\\.${KEY_SEGMENT}){1,})['"\`]`,
    'g'
);
// K-3 (2026-08-03) : élargi de `const T = '...'` à aussi
// `protected readonly T = '...'` (champ de classe) — trouvé sur
// finalization-details-dialog.component.ts/processing-details-dialog.
// component.ts/tasks-actions-processing-form-dialog.component.ts, qui
// déclarent leur préfixe comme champ de classe, pas comme `const` local.
// Attention : le groupe de préfixe ne doit JAMAIS pouvoir matcher vide —
// sinon la regex dégénère en « IDENT = 'chaîne majuscule' » n'importe où
// dans le fichier (bug trouvé en vérifiant le chiffre après ce changement :
// +284 clés référencées d'un coup pour 3 fichiers concernés, largement
// disproportionné — donc revérifié avant de le laisser passer). `readonly`
// est donc obligatoire dans la branche champ de classe, seul le modificateur
// d'accès devant lui est optionnel.
const PREFIX_DECL_RE =
    /(?:const\s+|let\s+|var\s+|(?:(?:public|private|protected)\s+)?readonly\s+)([A-Za-z_$][\w$]*)\s*=\s*'([^']+)'/g;
// Pas d'ancrage sur des backticks de part et d'autre : `${T}.SUFFIX` peut
// apparaître à l'intérieur d'un template literal plus large sans avoir ses
// propres backticks — ex. `titleKey="${T}.TITLE"` dans le `template:
// \`...\`` d'un `@Component` (interpolation de l'attribut HTML, pas une
// chaîne autonome). Trouvé sur `jobs-page.component.ts` et le même gabarit
// dans `monitoring`/`reporting`/`interactive-map` : sans cet assouplissement,
// `const T = 'MONITORING.JOBS'` n'était jamais vu comme utilisé, et sa
// valeur réapparaissait à tort comme clé "manquante" à elle seule (même
// classe de faux positif que `readonly T`/l'alias `ns`, cause différente).
// Sûr d'élargir : la résolution n'a d'effet que si `ident` est un préfixe
// réellement déclaré (voir `prefixCandidates`) ; sinon la capture ne mène à
// rien. `[\w.]*` s'arrête déjà naturellement au premier caractère qui n'est
// ni lettre/chiffre/underscore/point (guillemet, backtick, espace…), donc
// aucune bordure explicite n'est nécessaire pour clore le suffixe.
// `this.` optionnel devant l'identifiant, comme pour CONCAT_SUFFIX_RE —
// trouvé sur `` `${this.T}.DIALOG.TITLE.CREATE` `` (tasks-actions-processing-
// form-dialog.component.ts), pas seulement `${T}.SUFFIX` sans `this.`.
const TEMPLATE_SUFFIX_RE =
    /\$\{(?:this\.)?([A-Za-z_$][\w$]*)\}\.([A-Z][\w.]*)/g;
// Même trois fichiers : le suffixe n'est pas résolu par template literal
// (`` `${T}.X` ``) mais par concaténation (`T + '.X'`, y compris
// `this.T + '.X'` dans les templates inline Angular).
const CONCAT_SUFFIX_RE =
    /(?:this\.)?([A-Za-z_$][\w$]*)\s*\+\s*'(\.[A-Z][\w.]*)'/g;
// Alias à un niveau : `protected readonly ns = T;` (department-form.
// component.ts et modules du même gabarit) réexpose le préfixe sous un
// autre nom, utilisé ensuite via `ns + '.SUFFIX'`. Sans le résoudre : ces
// usages sont invisibles (faux négatif) ET le littéral d'origine de `T`
// réapparaît comme clé "manquante" à lui seul (faux positif) puisqu'il
// n'est plus jamais vu comme préfixe *directement* dans ce fichier.
const ALIAS_RE =
    /(?:const\s+|let\s+|var\s+|(?:(?:public|private|protected)\s+)?readonly\s+)([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g;

/**
 * Retire les commentaires avant le scan des usages (K-3) : un bloc `/** ... *\/`
 * ou une ligne `// ...` peut contenir un exemple de clé i18n en texte
 * (ex. JSDoc) sans que ce soit un usage réel — trouvé sur `I18N.KEY`.
 * Remplace par des espaces (pas une suppression) pour préserver les numéros
 * de ligne/colonnes des autres regex qui tournent sur le même texte.
 */
function stripComments(content) {
    let out = content.replace(/\/\*[\s\S]*?\*\//g, (m) =>
        m.replace(/[^\n]/g, ' ')
    );
    out = out.replace(
        /^([ \t]*)\/\/.*$/gm,
        (m, indent) => indent + ' '.repeat(m.length - indent.length)
    );
    return out;
}

function loadDefinedKeys() {
    const source = readFileSync(TRANSLATION_FILE, 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
        },
    });

    const tmpDir = mkdtempSync(join(tmpdir(), 'cmz-check-i18n-'));
    const tmpFile = join(tmpDir, 'fr.translation.mjs');
    writeFileSync(tmpFile, outputText);

    return import(`file://${tmpFile}`).then(({ FR }) => {
        const keys = new Set();
        (function walk(node, path) {
            for (const [key, value] of Object.entries(node)) {
                const nextPath = path ? `${path}.${key}` : key;
                if (typeof value === 'string') {
                    keys.add(nextPath);
                } else if (value && typeof value === 'object') {
                    walk(value, nextPath);
                }
            }
        })(FR, '');
        return keys;
    });
}

function listSourceFiles() {
    const files = new Set();
    for (const pattern of SCAN_GLOBS) {
        for (const file of globSync(pattern, { cwd: ROOT })) {
            if (EXCLUDE_SEGMENTS.some((seg) => file.includes(seg))) continue;
            files.add(file);
        }
    }
    return [...files].sort();
}

function collectReferencedKeys(files) {
    /** @type {Map<string, Set<string>>} clé → fichiers où elle apparaît */
    const usages = new Map();
    const addUsage = (key, file) => {
        // Résidu d'une composition dynamique non résolvable statiquement —
        // ex. `` t(ns + '.FORM.TITLE.' + mode().toUpperCase()) `` : le
        // fragment capturé s'arrête à `.FORM.TITLE.` (le `mode()` runtime
        // n'est pas une string literal, donc invisible pour cette regex).
        // Une clé qui finit par un point n'est jamais une vraie feuille —
        // vérifié sur ce cas précis : `mode()` vaut 'create'|'edit', et
        // `FORM.TITLE.CREATE`/`FORM.TITLE.EDIT` sont bel et bien définies
        // (apps/backoffice-angular/src/app/i18n/fr.translation.ts). Sans ce
        // filtre, 20 fausses clés manquantes (une par module list/detail
        // partageant ce gabarit) polluaient le rapport.
        if (key.endsWith('.')) return;
        if (!usages.has(key)) usages.set(key, new Set());
        usages.get(key).add(file);
    };

    for (const file of files) {
        const content = stripComments(readFileSync(join(ROOT, file), 'utf8'));

        // 1) const T = 'PREFIX' (ou champ de classe `readonly T = 'PREFIX'`)
        // déclarés dans le fichier. Candidats seulement à ce stade : un champ
        // `readonly messageKey = 'COMMON.DATE_RANGE.INVALID'` a la même forme
        // syntaxique mais est un **usage direct** (la clé complète), pas un
        // préfixe — se en assurer en ne retenant comme préfixe que les
        // identifiants réellement recomposés plus loin via `${T}.X` ou
        // `T + '.X'` (étape 2). Sans cette distinction, `messageKey` (et
        // 8 autres clés du même type dans `libs/*/domain/**/errors/`)
        // disparaissaient à tort du rapport — régression trouvée en
        // comparant le rapport avant/après ce correctif, avant de le
        // considérer terminé (même discipline que les 4 précédents).
        const prefixCandidates = new Map();
        const candidateLiteralRanges = new Map();
        for (const m of content.matchAll(PREFIX_DECL_RE)) {
            const [, ident, value] = m;
            if (/^[A-Z][A-Z0-9._]*$/.test(value)) {
                prefixCandidates.set(ident, value);
                const start = m.index + m[0].lastIndexOf(value);
                candidateLiteralRanges.set(ident, [
                    start,
                    start + value.length,
                ]);
            }
        }

        // 1b) alias à un niveau (`readonly ns = T;`) — `ns` recompose alors
        // le même préfixe que `T` sous un autre nom.
        const aliasSource = new Map();
        for (const m of content.matchAll(ALIAS_RE)) {
            const [, aliasIdent, sourceIdent] = m;
            if (
                prefixCandidates.has(sourceIdent) &&
                !prefixCandidates.has(aliasIdent)
            ) {
                prefixCandidates.set(
                    aliasIdent,
                    prefixCandidates.get(sourceIdent)
                );
                aliasSource.set(aliasIdent, sourceIdent);
            }
        }

        const usedAsPrefix = new Set();
        const markUsedAsPrefix = (ident) => {
            usedAsPrefix.add(ident);
            const source = aliasSource.get(ident);
            if (source) usedAsPrefix.add(source); // protège aussi le littéral d'origine
        };

        // 2) `${T}.SUFFIX` résolu via un candidat préfixe réellement recomposé
        for (const m of content.matchAll(TEMPLATE_SUFFIX_RE)) {
            const [, ident, suffix] = m;
            const prefix = prefixCandidates.get(ident);
            if (prefix) {
                addUsage(`${prefix}.${suffix}`, file);
                markUsedAsPrefix(ident);
            }
        }

        // 2b) `T + '.SUFFIX'` (concaténation, y compris `this.T + '.SUFFIX'`
        // dans les templates inline Angular), même règle.
        for (const m of content.matchAll(CONCAT_SUFFIX_RE)) {
            const [, ident, suffix] = m;
            const prefix = prefixCandidates.get(ident);
            if (prefix) {
                addUsage(`${prefix}${suffix}`, file);
                markUsedAsPrefix(ident);
            }
        }

        // Seuls les candidats réellement utilisés comme préfixe (2, 2b) sont
        // exclus du scan direct (3) — leur littéral n'est jamais lui-même
        // une clé complète, seulement un fragment recomposé. Un alias (`ns`)
        // n'a pas de littéral propre (`candidateLiteralRanges` n'en a que
        // pour les vraies déclarations `= '...'`) : seule sa source (`T`) en
        // a un à protéger, déjà couvert par `markUsedAsPrefix`.
        const prefixLiteralRanges = [...usedAsPrefix]
            .map((ident) => candidateLiteralRanges.get(ident))
            .filter(Boolean);
        const isPrefixDeclaration = (index) =>
            prefixLiteralRanges.some(
                ([start, end]) => index >= start && index < end
            );

        // 3) littéraux directs 'X.Y.Z' — hors déclarations de préfixe (1)
        for (const m of content.matchAll(FLAT_KEY_RE)) {
            const keyStart = m.index + 1; // +1 : sauter le guillemet ouvrant
            if (isPrefixDeclaration(keyStart)) continue;
            addUsage(m[1], file);
        }
    }

    return usages;
}

async function main() {
    const warnOnly = process.argv.includes('--warn-only');

    const definedKeys = await loadDefinedKeys();
    const files = listSourceFiles();
    const usages = collectReferencedKeys(files);

    const missing = [...usages.keys()]
        .filter((key) => !definedKeys.has(key))
        .sort();
    const unused = [...definedKeys].filter((key) => !usages.has(key)).sort();

    console.log(
        `check:i18n — ${definedKeys.size} clés définies, ${usages.size} clés référencées (regex + résolution ${'`'}${'$'}{T}.SUFFIX${'`'}), ${files.length} fichiers scannés.\n`
    );

    if (missing.length > 0) {
        console.log(
            `❌ ${missing.length} clé(s) référencée(s) mais NON définie(s) dans fr.translation.ts :\n`
        );
        for (const key of missing) {
            const inFiles = [...usages.get(key)]
                .map((f) => relative(ROOT, join(ROOT, f)))
                .slice(0, 3);
            console.log(`  ${key}`);
            for (const f of inFiles) console.log(`    ← ${f}`);
        }
        console.log('');
    } else {
        console.log('✅ 0 clé référencée sans définition.\n');
    }

    if (unused.length > 0) {
        console.log(
            `⚠️  ${unused.length} clé(s) définie(s) mais jamais référencée(s) (traduction morte — avertissement, pas un échec).`
        );
    }

    if (missing.length > 0 && !warnOnly) {
        console.log(
            '\nRéserve de méthode (K-3, audit-workspace-2026-08-02-addendum.md) : ' +
                'cette liste mélange probablement de vraies clés manquantes et des ' +
                'faux positifs résiduels de la regex sur les usages. Trier avant de ' +
                'rendre ce check bloquant en CI, ou relancer avec --warn-only en attendant.'
        );
        process.exitCode = 1;
    }
}

await main();
