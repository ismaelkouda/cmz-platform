#!/usr/bin/env node
/**
 * check-pattern-nx.mjs
 *
 * Audit J-9 (revue finale 2026-08-02, onzième passe 2026-08-04) — vérifie la
 * PRÉSENCE des fichiers du cœur canonique d'un pattern Nx-shaped
 * (`docs/architecture/patterns/*.pattern.json`) contre un vrai module
 * `libs/<module>` de ce dépôt.
 *
 * **T2-6 (ADR-0027, 2026-08-13) — généralisation** : à l'origine, ce script ne
 * consommait que la forme `core_files_nx` (objet catégories -> tableaux de
 * chemins), utilisée par `crud-entity.pattern.json`. `workflow-action.
 * pattern.json` (`list_volet_core_files_nx`, tableau plat) et `read-only-
 * view.pattern.json` (`grafana_multi_section_core_files_nx` +
 * `grafana_single_view_core_files_nx`) étaient hors périmètre — limite
 * documentée explicitement dans une version antérieure de ce docstring.
 * Généralisé ici pour résoudre N'IMPORTE QUEL champ de fichiers (peu importe
 * son nom) via `--files-field`, avec un défaut dynamique dérivé de
 * `composition[].files_field` quand le schéma n'en déclare qu'un seul.
 *
 * **Choix de conception (documenté, pas deviné) : `--files-field` explicite
 * plutôt qu'une détection 100% automatique.** La détection dynamique pure
 * (lire `composition[].files_field` et choisir tout seul) fonctionne pour
 * crud-entity et workflow-action (un seul `files_field` dans leur
 * `composition`), mais read-only-view en déclare DEUX
 * (`grafana_multi_section_core_files_nx` ET `grafana_single_view_core_files_nx`,
 * un par sous-graphe/variant) — une détection automatique devrait alors
 * deviner laquelle des deux compositions concerne l'appel, ce qui reviendrait
 * à réinventer un mini-registre de mapping module -> sous-graphe (fragile,
 * cf. écart déjà trouvé une fois par `check-pattern-nx-coverage.mjs` pour
 * crud-entity). Un flag explicite est déterministe et ne dépend d'aucune
 * heuristique sur le nom du module. Comportement retenu : si `--files-field`
 * est omis, tenter un défaut dynamique SEULEMENT quand `composition[].
 * files_field` du schéma ne référence qu'un seul champ distinct (cas
 * crud-entity, workflow-action, action-request) ; sinon, erreur explicite
 * demandant `--files-field`, jamais un choix silencieux arbitraire.
 *
 * `--files-field` accepte une liste séparée par des virgules pour combiner
 * plusieurs champs en une seule vérification (ex. read-only-view module
 * `interactive-map`, qui a historiquement les deux sous-graphes grafana_*
 * dans le même module : `--files-field
 * grafana_multi_section_core_files_nx,grafana_single_view_core_files_nx`).
 *
 * Chaque champ de fichiers peut être soit un tableau plat (`list_volet_core_
 * files_nx`, `grafana_single_view_core_files_nx`), soit un objet de
 * catégories -> tableaux (`core_files_nx`, `grafana_multi_section_core_files_
 * nx`) — les deux formes sont aplaties de la même façon
 * (`Object.values(...).flat()` / passage direct si déjà un tableau).
 *
 * **Placeholders** : `{entity}`/`{MODULE}`/`{module}` résolus comme avant
 * (rétro-compatible, comportement bit-à-bit identique sur crud-entity sans
 * `--files-field`). Des placeholders additionnels (`{volet}`, `{section-
 * kebab}`, `{operation}`, ...) sont résolus via `--set NOM=valeur` (répétable)
 * — nécessaire pour workflow-action (`{volet}`) et read-only-view
 * (`{section-kebab}`), dont les templates ne se limitent pas à
 * `{entity}`/`{MODULE}`.
 *
 * **Non-régression** : sans `--files-field` ni `--set`, le comportement sur
 * `core_files_nx` (crud-entity) est identique à la version précédente de ce
 * script — mêmes fichiers résolus, même calcul de score, mêmes messages.
 *
 * **Bug trouvé dans le vendored `check-pattern.mjs` en écrivant la première
 * version de ce script, volontairement NON corrigé ici** : son chemin de
 * schéma par défaut (`path.join(__dirname, '..', 'patterns', ...)`) pointe
 * vers `tools/patterns/crud-entity.pattern.json` (n'existe pas) au lieu de
 * `tools/seos/patterns/crud-entity.pattern.json` — confirmé présent aussi
 * dans la source legacy elle-même, donc pas une régression du vendoring. Ce
 * script ne le corrige pas (règle de provenance du vendoring SEOS) — la
 * correction doit être portée dans le dépôt legacy source, puis re-vendorée.
 *
 * Usage :
 *   node tools/check-pattern-nx.mjs <chemin-du-module-libs> <nom-entite> --schema <schema.json> \
 *     [--files-field <champ[,champ2,...]>] [--set NOM=valeur ...]
 *
 * Exemples :
 *   node tools/check-pattern-nx.mjs libs/administrative-infrastructure infrastructure \
 *     --schema docs/architecture/patterns/crud-entity.pattern.json
 *
 *   node tools/check-pattern-nx.mjs libs/processing queues \
 *     --schema docs/architecture/patterns/workflow-action.pattern.json \
 *     --files-field list_volet_core_files_nx --set volet=queues
 *
 *   node tools/check-pattern-nx.mjs libs/monitoring node \
 *     --schema docs/architecture/patterns/read-only-view.pattern.json \
 *     --files-field grafana_multi_section_core_files_nx --set section-kebab=node
 */

import { existsSync, readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

function usage() {
    return (
        'Usage: node tools/check-pattern-nx.mjs <chemin-du-module-libs> <nom-entite> ' +
        '--schema <schema.json> [--files-field <champ[,champ2,...]>] [--set NOM=valeur ...]'
    );
}

function parseArgs(argv) {
    const rawArgs = [...argv];
    let schemaPath = null;
    let filesFieldRaw = null;
    const overrides = {};

    for (let i = rawArgs.length - 1; i >= 0; i -= 1) {
        if (rawArgs[i] === '--schema' && rawArgs[i + 1] !== undefined) {
            schemaPath = rawArgs[i + 1];
            rawArgs.splice(i, 2);
        } else if (
            rawArgs[i] === '--files-field' &&
            rawArgs[i + 1] !== undefined
        ) {
            filesFieldRaw = rawArgs[i + 1];
            rawArgs.splice(i, 2);
        } else if (rawArgs[i] === '--set' && rawArgs[i + 1] !== undefined) {
            const [key, ...rest] = rawArgs[i + 1].split('=');
            if (key && rest.length > 0) {
                overrides[key] = rest.join('=');
            }
            rawArgs.splice(i, 2);
        }
    }

    const [moduleRoot, entityName] = rawArgs;
    return { moduleRoot, entityName, schemaPath, filesFieldRaw, overrides };
}

const { moduleRoot, entityName, schemaPath, filesFieldRaw, overrides } =
    parseArgs(process.argv.slice(2));

if (!schemaPath) {
    console.error(usage());
    process.exit(1);
}

const resolvedSchemaPath = resolve(schemaPath);

if (!moduleRoot || !entityName) {
    console.error(usage());
    process.exit(1);
}

if (!existsSync(moduleRoot)) {
    console.error(
        `Erreur : le chemin "${moduleRoot}" n'existe pas depuis ${process.cwd()}.\n` +
            `Exemple : node tools/check-pattern-nx.mjs libs/administrative-infrastructure infrastructure --schema docs/architecture/patterns/crud-entity.pattern.json`
    );
    process.exit(2);
}

if (!existsSync(resolvedSchemaPath)) {
    console.error(`Erreur : schéma introuvable — ${resolvedSchemaPath}`);
    process.exit(2);
}

const spec = JSON.parse(readFileSync(resolvedSchemaPath, 'utf8'));

/**
 * Résout la ou les clés de champ(s) de fichiers à utiliser.
 * 1. `--files-field` explicite (une ou plusieurs, séparées par des virgules)
 *    est toujours prioritaire.
 * 2. Sinon, retombe sur `core_files_nx` si présent (comportement historique,
 *    non-régression bit-à-bit pour crud-entity).
 * 3. Sinon, tente un défaut dynamique via `composition[].files_field` — mais
 *    UNIQUEMENT si le schéma n'en déclare qu'un seul distinct (cf. docstring
 *    ci-dessus : au-delà de 1, une détection automatique serait une
 *    heuristique non fiable).
 */
function resolveFilesFieldNames(spec, filesFieldRaw) {
    if (filesFieldRaw) {
        return filesFieldRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    if (spec.core_files_nx && typeof spec.core_files_nx === 'object') {
        return ['core_files_nx'];
    }

    if (Array.isArray(spec.composition)) {
        const distinct = [
            ...new Set(
                spec.composition
                    .map((c) => c?.files_field)
                    .filter((f) => typeof f === 'string' && f.length > 0)
            ),
        ];
        if (distinct.length === 1) {
            return distinct;
        }
        if (distinct.length > 1) {
            console.error(
                `Erreur : "${resolvedSchemaPath}" déclare plusieurs champs de fichiers ` +
                    `distincts dans "composition" (${distinct.join(', ')}) — impossible de ` +
                    'choisir automatiquement lequel vérifier. Précise --files-field explicitement ' +
                    '(un seul champ, ou plusieurs séparés par une virgule pour les combiner).'
            );
            process.exit(2);
        }
    }

    console.error(
        `Erreur : "${resolvedSchemaPath}" n'a ni champ "core_files_nx" ni "composition[].` +
            'files_field" exploitable pour déterminer la liste de fichiers à vérifier. ' +
            'Précise --files-field <nom-du-champ> explicitement (ex. list_volet_core_files_nx, ' +
            'grafana_multi_section_core_files_nx).'
    );
    process.exit(2);
}

const filesFieldNames = resolveFilesFieldNames(spec, filesFieldRaw);

/** Aplati un champ de fichiers, qu'il soit tableau plat ou objet catégories -> tableaux. */
function flattenFilesField(value, fieldName) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value).flat();
    console.error(
        `Erreur : le champ "${fieldName}" de "${resolvedSchemaPath}" n'est ni un tableau ` +
            'ni un objet de catégories -> tableaux.'
    );
    process.exit(2);
}

const coreFiles = filesFieldNames.flatMap((fieldName) => {
    const value = spec[fieldName];
    if (value === undefined) {
        console.error(
            `Erreur : "${resolvedSchemaPath}" n'a pas de champ "${fieldName}".`
        );
        process.exit(2);
    }
    return flattenFilesField(value, fieldName);
});

const moduleName = basename(resolve(moduleRoot));
const nxPrefix = `libs/${moduleName}/`;

/**
 * Résout les placeholders d'un template. `{entity}`/`{MODULE}`/`{module}`
 * ont un défaut dérivé des arguments positionnels (rétro-compatible :
 * `{entity}` -> entityName, `{MODULE}` -> moduleName). Tout `--set NOM=valeur`
 * fourni en CLI a priorité sur ces défauts et couvre les placeholders
 * additionnels des autres verbes (`{volet}`, `{section-kebab}`, `{operation}`, ...).
 */
function resolveTemplate(tpl) {
    const defaults = {
        entity: entityName,
        MODULE: moduleName,
        module: moduleName,
    };
    const values = { ...defaults, ...overrides };

    let resolved = tpl;
    for (const [key, val] of Object.entries(values)) {
        resolved = resolved.split(`{${key}}`).join(val);
    }
    return resolved;
}

const missing = [];
const present = [];

for (const tpl of coreFiles) {
    const resolved = resolveTemplate(tpl);
    // Un template "libs/{MODULE}/..." se vérifie relativement à moduleRoot
    // (comportement historique, inchangé). Un template hors de ce préfixe —
    // ex. "apps/backoffice-angular/.../{module}.providers.ts" (module_shell,
    // list_volet_core_files_nx de workflow-action) — se vérifie relativement
    // à process.cwd() (racine du repo, cf. docstring "Usage"), jamais joint
    // à moduleRoot (qui produirait un chemin invalide du type
    // "libs/processing/apps/backoffice-angular/...").
    const isNxLibPath = resolved.startsWith(nxPrefix);
    const rel = isNxLibPath ? resolved.slice(nxPrefix.length) : resolved;
    const abs = isNxLibPath ? join(moduleRoot, rel) : resolve(resolved);
    (existsSync(abs) ? present : missing).push(rel);
}

const total = coreFiles.length;
const score = total > 0 ? ((present.length / total) * 100).toFixed(1) : '0.0';

console.log(
    `SEOS (Nx-shaped) — vérification du pattern "${spec.pattern}" (${spec.lineage ?? 'lineage non déclarée'})`
);
console.log(`Module : ${moduleRoot}`);
console.log(`Entité : ${entityName}`);
console.log(`Champ(s) de fichiers : ${filesFieldNames.join(', ')}`);
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
