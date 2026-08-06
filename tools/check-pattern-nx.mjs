#!/usr/bin/env node
/**
 * check-pattern-nx.mjs
 *
 * Audit J-9 (revue finale 2026-08-02, onzième passe 2026-08-04) — vérifie la
 * PRÉSENCE des fichiers du cœur canonique d'un pattern Nx-shaped
 * (`docs/architecture/patterns/*.pattern.json`, champ `core_files_nx`) contre
 * un vrai module `libs/<module>` de ce dépôt.
 *
 * **Pourquoi un fichier séparé, pas une extension de `tools/seos/
 * check-pattern.mjs`** : ce dernier est un vendoring **byte-identique** du
 * dépôt legacy (`tools/seos/README.md` — "ne pas les éditer ici — toute
 * correction doit être portée dans le dépôt legacy puis re-vendorée, pour ne
 * jamais diverger silencieusement de la source de vérité de la recherche
 * SEOS"). Une première version de ce travail avait modifié ce fichier vendoré
 * directement — revert immédiat dès la règle relue, remplacé par ce script
 * autonome (audit-workspace-2026-08-03.md, §7, onzième passe). Même logique
 * de résolution de template que le script legacy, réimplémentée ici plutôt
 * que partagée, précisément pour ne créer aucune dépendance vers le fichier
 * vendoré (qui pourrait changer de forme à tout re-vendoring futur sans
 * préavis pour ce script).
 *
 * **Bug trouvé dans le vendored `check-pattern.mjs` en écrivant ce script,
 * volontairement NON corrigé ici** : son chemin de schéma par défaut
 * (`path.join(__dirname, '..', 'patterns', ...)`) pointe vers
 * `tools/patterns/crud-entity.pattern.json` (n'existe pas) au lieu de
 * `tools/seos/patterns/crud-entity.pattern.json` (où vit réellement le
 * fichier) — confirmé présent aussi dans la source legacy elle-même
 * (`cmz-backoffice-frontend/seos/tools/check-pattern.js`, même ligne), donc
 * pas une régression du vendoring. Le premier exemple d'usage de son propre
 * docstring ("schéma par défaut") échoue donc systématiquement sans
 * `--schema` explicite. Ce script ne le corrige pas (règle de provenance
 * ci-dessus) — la correction doit être portée dans le dépôt legacy source,
 * puis re-vendorée ; documenté dans l'audit pour que ce ne soit pas reperdu.
 *
 * Usage :
 *   node tools/check-pattern-nx.mjs <chemin-du-module-libs> <nom-entite> --schema <schema.json>
 *
 * Exemple :
 *   node tools/check-pattern-nx.mjs libs/administrative-infrastructure infrastructure \
 *     --schema docs/architecture/patterns/crud-entity.pattern.json
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const rawArgs = process.argv.slice(2);
const schemaFlagIndex = rawArgs.indexOf('--schema');
if (schemaFlagIndex === -1 || !rawArgs[schemaFlagIndex + 1]) {
    console.error(
        'Usage: node tools/check-pattern-nx.mjs <chemin-du-module-libs> <nom-entite> --schema <schema.json>'
    );
    process.exit(1);
}
const schemaPath = resolve(rawArgs[schemaFlagIndex + 1]);
const positional = [...rawArgs];
positional.splice(schemaFlagIndex, 2);
const [moduleRoot, entityName] = positional;

if (!moduleRoot || !entityName) {
    console.error(
        'Usage: node tools/check-pattern-nx.mjs <chemin-du-module-libs> <nom-entite> --schema <schema.json>'
    );
    process.exit(1);
}

if (!existsSync(moduleRoot)) {
    console.error(
        `Erreur : le chemin "${moduleRoot}" n'existe pas depuis ${process.cwd()}.\n` +
            `Exemple : node tools/check-pattern-nx.mjs libs/administrative-infrastructure infrastructure --schema docs/architecture/patterns/crud-entity.pattern.json`
    );
    process.exit(2);
}

if (!existsSync(schemaPath)) {
    console.error(`Erreur : schéma introuvable — ${schemaPath}`);
    process.exit(2);
}

const spec = JSON.parse(readFileSync(schemaPath, 'utf8'));

if (!spec.core_files_nx || typeof spec.core_files_nx !== 'object') {
    console.error(
        `Erreur : "${schemaPath}" n'a pas de champ "core_files_nx" (objet de ` +
            `catégories -> tableaux de chemins). Ce script ne vérifie que cette ` +
            `forme — pour un schéma legacy plat ("core_files"), utiliser ` +
            `tools/seos/check-pattern.mjs --schema à la place.\n\n` +
            `Note : workflow-action.pattern.json et read-only-view.pattern.json ` +
            `n'ont pas non plus ce champ générique — leurs listes Nx sont ` +
            `éclatées par sous-graphe sous des noms spécifiques ` +
            `("list_volet_core_files_nx", "grafana_multi_section_core_files_nx", ` +
            `...). Non couvert par ce script, généralisation délibérément ` +
            `écartée pour cette passe (effort séparé si besoin).`
    );
    process.exit(2);
}

const coreFiles = Object.values(spec.core_files_nx).flat();
const moduleName = basename(resolve(moduleRoot));
const nxPrefix = `libs/${moduleName}/`;

function resolveTemplate(tpl) {
    return tpl
        .replace(/\{entity\}/g, entityName)
        .replace(/\{MODULE\}/g, moduleName);
}

const missing = [];
const present = [];

for (const tpl of coreFiles) {
    const resolved = resolveTemplate(tpl);
    const rel = resolved.startsWith(nxPrefix)
        ? resolved.slice(nxPrefix.length)
        : resolved;
    const abs = join(moduleRoot, rel);
    (existsSync(abs) ? present : missing).push(rel);
}

const total = coreFiles.length;
const score = total > 0 ? ((present.length / total) * 100).toFixed(1) : '0.0';

console.log(
    `SEOS (Nx-shaped) — vérification du pattern "${spec.pattern}" (${spec.lineage ?? 'lineage non déclarée'})`
);
console.log(`Module : ${moduleRoot}`);
console.log(`Entité : ${entityName}`);
console.log(
    `Conformité : ${present.length}/${total} fichiers du cœur présents (${score}%)`
);

if (missing.length > 0) {
    console.log(`\nFichiers manquants (${missing.length}) :`);
    for (const m of missing) {
        console.log(`  - ${m}`);
    }
    console.log(
        '\nNote : ce script ne vérifie que la PRÉSENCE des fichiers, jamais leur ' +
            'contenu — même limite que check-semantics.mjs (non porté en Nx cette ' +
            'passe, cf. docstring de ce fichier).'
    );
    process.exit(1);
}

console.log('\nAucun fichier du cœur manquant.');
process.exit(0);
