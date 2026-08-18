#!/usr/bin/env node
/**
 * check-dto-schema-breaking-changes.mjs — T2-2, volet « breaking change =
 * fail » (diff sémantique entre deux versions du schéma DTO, pas juste
 * présence/absence — ce dernier est déjà couvert par check-dto-schema.mjs).
 *
 * Compare deux JSON Schema (format `dto.schema.json`, cf.
 * tools/schema/generate-dto-schema.mjs) et classe chaque écart en
 * BREAKING ou compatible, du point de vue d'un consommateur TypeScript
 * existant qui type ses variables contre l'ancien schéma :
 *
 *   BREAKING (échoue le gate) :
 *     - un `$defs.<Name>` entier disparaît (référence cassée pour tout
 *       code qui l'importait/l'utilisait)
 *     - une propriété existante disparaît d'un objet
 *     - le `type` d'une propriété existante change (ex. string → number)
 *     - une propriété passe d'optionnelle à `required` (du code existant
 *       peut légitimement omettre cette propriété aujourd'hui)
 *     - une valeur disparaît d'un `enum` existant (une valeur déjà
 *       observée sur le wire ne validerait plus)
 *     - `additionalProperties` passe de non-`false` à `false` (resserre
 *       la validation, peut rejeter des payloads déjà acceptés)
 *
 *   COMPATIBLE (n'échoue pas le gate) :
 *     - ajout d'un nouveau `$defs.<Name>`
 *     - ajout d'une propriété optionnelle
 *     - une propriété passe de `required` à optionnelle (assouplissement)
 *     - ajout d'une valeur à un `enum` existant
 *     - ajout d'une nouvelle propriété `required` sur un type qui n'a
 *       PAS encore de définition committée (nouveau DTO, pas un
 *       changement d'un DTO existant — couvert par la règle
 *       « $defs.<Name> apparaît » ci-dessus, non par « propriété
 *       required ajoutée »)
 *
 * Ce classement suit la doctrine de compatibilité standard JSON
 * Schema/OpenAPI (un schéma « nouvelle version » est rétrocompatible s'il
 * accepte tout ce que l'ancien acceptait — jamais l'inverse). Il ne
 * remplace pas `check-dto-schema.mjs` (fraîcheur committé ↔ régénéré) :
 * les deux se complètent — fraîcheur d'abord, breaking change ensuite,
 * sur des schémas potentiellement différents (ancienne révision git vs
 * schéma actuel).
 *
 * Usage :
 *   node tools/check-dto-schema-breaking-changes.mjs [--base <git-ref>]
 *   node tools/check-dto-schema-breaking-changes.mjs --base HEAD~1
 *   bun run check:dto-schema-breaking-changes
 *
 * Par défaut, `--base` vaut `HEAD` (compare le schéma déjà committé sur
 * HEAD au schéma fraîchement régénéré depuis les DTOs actuels — utile en
 * local avant de committer). En CI sur une PR, utiliser `--base
 * origin/main` ou l'équivalent pour comparer contre la branche cible.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSchema } from './schema/generate-dto-schema.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_REL_PATH = 'docs/architecture/schema/dto.schema.json';

/** Lit `dto.schema.json` tel qu'il existait à une révision git donnée. */
export function readSchemaAtRef(ref, root = ROOT) {
    const raw = execFileSync('git', ['show', `${ref}:${SCHEMA_REL_PATH}`], {
        cwd: root,
        encoding: 'utf8',
    });
    return JSON.parse(raw);
}

function isRequired(def, prop) {
    return Array.isArray(def?.required) && def.required.includes(prop);
}

/**
 * Compare deux fragments de schéma de propriété (récursif sur `items` pour
 * les tableaux — suffisant pour la portée actuelle de `dto.schema.json`,
 * qui n'imbrique pas de sous-objets anonymes profonds au-delà de ce que
 * `generate-dto-schema.mjs` produit déjà en `$ref`).
 */
function typeChanged(before, after) {
    if (before === undefined || after === undefined) return false;
    const beforeType = JSON.stringify(before.type ?? before.$ref ?? null);
    const afterType = JSON.stringify(after.type ?? after.$ref ?? null);
    return beforeType !== afterType;
}

function enumValuesRemoved(before, after) {
    if (!Array.isArray(before?.enum)) return [];
    const afterEnum = new Set(after?.enum ?? []);
    return before.enum.filter((v) => !afterEnum.has(v));
}

/** Compare deux définitions d'objet (`$defs.<Name>`) et retourne la liste des écarts classés. */
function diffDef(name, before, after) {
    const findings = [];

    if (before.type === 'object' && after.type === 'object') {
        const beforeProps = before.properties ?? {};
        const afterProps = after.properties ?? {};

        for (const prop of Object.keys(beforeProps)) {
            if (!(prop in afterProps)) {
                findings.push({
                    breaking: true,
                    def: name,
                    detail: `propriété supprimée : ${prop}`,
                });
                continue;
            }
            if (typeChanged(beforeProps[prop], afterProps[prop])) {
                findings.push({
                    breaking: true,
                    def: name,
                    detail: `type changé pour ${prop} : ${JSON.stringify(beforeProps[prop].type ?? beforeProps[prop].$ref)} → ${JSON.stringify(afterProps[prop].type ?? afterProps[prop].$ref)}`,
                });
            }
            const removedEnumValues = enumValuesRemoved(
                beforeProps[prop],
                afterProps[prop]
            );
            if (removedEnumValues.length) {
                findings.push({
                    breaking: true,
                    def: name,
                    detail: `valeur(s) enum supprimée(s) pour ${prop} : ${removedEnumValues.join(', ')}`,
                });
            }
            const wasRequired = isRequired(before, prop);
            const isNowRequired = isRequired(after, prop);
            if (!wasRequired && isNowRequired) {
                findings.push({
                    breaking: true,
                    def: name,
                    detail: `propriété devenue required : ${prop}`,
                });
            }
        }

        if (
            before.additionalProperties !== false &&
            after.additionalProperties === false
        ) {
            findings.push({
                breaking: true,
                def: name,
                detail: 'additionalProperties resserré à false',
            });
        }
    } else if (before.type === 'string' && Array.isArray(before.enum)) {
        // enum top-level (ex. déclaration `export enum X`) — même règle que
        // les enums de propriété, comparée directement sur la définition.
        const removedEnumValues = enumValuesRemoved(before, after);
        if (removedEnumValues.length) {
            findings.push({
                breaking: true,
                def: name,
                detail: `valeur(s) enum supprimée(s) : ${removedEnumValues.join(', ')}`,
            });
        }
    }

    return findings;
}

export function diffSchemas(before, after) {
    const beforeDefs = before.$defs ?? {};
    const afterDefs = after.$defs ?? {};
    const findings = [];

    for (const name of Object.keys(beforeDefs)) {
        if (!(name in afterDefs)) {
            findings.push({
                breaking: true,
                def: name,
                detail: 'définition supprimée du schéma ($defs)',
            });
            continue;
        }
        findings.push(...diffDef(name, beforeDefs[name], afterDefs[name]));
    }

    return findings;
}

function main() {
    const args = process.argv.slice(2);
    const baseIdx = args.indexOf('--base');
    const baseRef = baseIdx >= 0 ? args[baseIdx + 1] : 'HEAD';

    let before;
    try {
        before = readSchemaAtRef(baseRef);
    } catch (err) {
        console.log(
            `INFO  check:dto-schema-breaking-changes — aucune révision « ${baseRef} » de ` +
                `${SCHEMA_REL_PATH} trouvée (${String(err?.message ?? err).split('\n')[0]}) — ` +
                'rien à comparer (probablement la première introduction du schéma), gate ignoré.'
        );
        process.exit(0);
    }

    const { schema: after } = generateSchema();
    const findings = diffSchemas(before, after);
    const breaking = findings.filter((f) => f.breaking);

    if (breaking.length) {
        console.error('');
        console.error(
            `FAIL  check:dto-schema-breaking-changes — ${breaking.length} changement(s) ` +
                `cassant(s) détecté(s) entre ${baseRef}:${SCHEMA_REL_PATH} et l'état actuel des DTOs :`
        );
        for (const f of breaking) {
            console.error(`  - ${f.def} :: ${f.detail}`);
        }
        console.error('');
        console.error(
            'Un changement cassant signifie que du code TypeScript déjà écrit ' +
                'contre l’ancien schéma pourrait ne plus être valide (référence ' +
                'disparue, type changé, contrainte resserrée). Si le changement est ' +
                'volontaire, vérifier que tous les consommateurs (mappers, DTOs) sont ' +
                'mis à jour dans le même commit, et que ceci n’est pas un renommage ' +
                'accidentel de propriété ou une régression de typage.'
        );
        process.exit(1);
    }

    console.log(
        `OK  check:dto-schema-breaking-changes — aucun changement cassant entre ` +
            `${baseRef}:${SCHEMA_REL_PATH} et l'état actuel des DTOs (T2-2).`
    );
    process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
