#!/usr/bin/env node
/**
 * Validation du schéma du noyau de verbes structurels (T2-6 / ADR-0027) —
 * **sans Ajv**, même doctrine que `tools/corpus/validate-pair-schema.mjs`
 * (monorepo sans réseau sandbox, pas de résolveur `ajv` fragile).
 *
 * Un validateur JSON Schema minimal (types, enum, required, pattern,
 * $ref $defs, if/then, additionalProperties) suffit à couvrir exactement
 * `pattern-core.schema.json` — pas besoin de la totalité de draft 2020-12.
 *
 * Au-delà de la validation JSON Schema générique, ce script vérifie les
 * invariants propres au profil Angular/Nx, non exprimables par le sous-ensemble
 * JSON Schema supporté ici :
 *   1. `CORE_VERBS` respecte `$defs.verbRegistry` et chaque placeholder de
 *      template est déclaré par son verbe.
 *   2. Chaque `composition[].verb` référence un verbe qui existe réellement
 *      dans le registre `CORE_VERBS` du schéma (pas seulement dans l'enum —
 *      l'enum liste les noms possibles, CORE_VERBS est la définition réelle).
 *   3. Chaque `composition[].variant`, quand renseigné, correspond à une
 *      entrée déclarée dans `CORE_VERBS.<verb>.variants`.
 *   4. Chaque `composition[].files_field`, quand renseigné, existe dans le
 *      pattern et référence un tableau ou un objet de listes.
 * (Le if/then du schéma couvre déjà la règle "justification requise si
 * verb=custom" — pas dupliqué ici.)
 *
 * Usage :
 *   node docs/architecture/patterns/validate-pattern-core.mjs
 *   node docs/architecture/patterns/validate-pattern-core.mjs <fichier.pattern.json> [...]
 *
 * Sans argument : valide tous les `*.pattern.json` du dossier
 * `docs/architecture/patterns/` (sauf `pattern-core.schema.json` lui-même).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(HERE, 'pattern-core.schema.json');

/**
 * Validateur JSON Schema fait main — sous-ensemble suffisant pour
 * pattern-core.schema.json : type, enum, required, pattern, minItems,
 * minLength, $ref (#/$defs/*), if/then (const uniquement), additionalProperties.
 *
 * @param {object} schema
 * @param {unknown} data
 * @param {string} path
 * @param {object} rootSchema
 * @returns {string[]}
 */
function validate(schema, data, path, rootSchema) {
    /** @type {string[]} */
    const errors = [];

    if (schema.$ref) {
        const ref = schema.$ref;
        if (!ref.startsWith('#/$defs/')) {
            return [`${path}: unsupported $ref ${ref}`];
        }
        const name = ref.slice('#/$defs/'.length);
        const def = rootSchema.$defs?.[name];
        if (!def) return [`${path}: unknown $defs ${name}`];
        return validate(def, data, path, rootSchema);
    }

    if (schema.type) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        const ok = types.some((t) => {
            if (t === 'null') return data === null;
            if (t === 'array') return Array.isArray(data);
            if (t === 'object')
                return (
                    data !== null &&
                    typeof data === 'object' &&
                    !Array.isArray(data)
                );
            if (t === 'integer')
                return typeof data === 'number' && Number.isInteger(data);
            return typeof data === t;
        });
        if (!ok) {
            errors.push(
                `${path}: type expected ${types.join('|')}, got ${describe(data)}`
            );
            return errors;
        }
    }

    if (schema.enum && !schema.enum.includes(data)) {
        errors.push(
            `${path}: value "${data}" not in enum [${schema.enum.join(', ')}]`
        );
    }

    if (typeof data === 'string') {
        if (schema.pattern) {
            const re = new RegExp(schema.pattern);
            if (!re.test(data)) {
                errors.push(`${path}: pattern mismatch (${schema.pattern})`);
            }
        }
        if (schema.minLength !== undefined && data.length < schema.minLength) {
            errors.push(`${path}: shorter than minLength ${schema.minLength}`);
        }
    }

    if (Array.isArray(data)) {
        if (schema.minItems !== undefined && data.length < schema.minItems) {
            errors.push(`${path}: fewer than minItems ${schema.minItems}`);
        }
        if (schema.items) {
            data.forEach((item, i) => {
                errors.push(
                    ...validate(schema.items, item, `${path}[${i}]`, rootSchema)
                );
            });
        }
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
        const obj = /** @type {Record<string, unknown>} */ (data);

        if (schema.required) {
            for (const key of schema.required) {
                if (!(key in obj)) {
                    errors.push(`${path}: missing required « ${key} »`);
                }
            }
        }

        if (schema.properties) {
            for (const [key, value] of Object.entries(obj)) {
                if (schema.properties[key]) {
                    errors.push(
                        ...validate(
                            schema.properties[key],
                            value,
                            path ? `${path}.${key}` : key,
                            rootSchema
                        )
                    );
                } else if (schema.additionalProperties === false) {
                    errors.push(
                        `${path}: additional property « ${key} » not allowed`
                    );
                }
            }
        }

        // if/then — supporte uniquement la forme utilisée par ce schéma :
        // { if: { properties: { <k>: { const: <v> } } }, then: { required: [...] } }
        if (schema.if && schema.then) {
            const ifProps = schema.if.properties ?? {};
            const matches = Object.entries(ifProps).every(([k, sub]) => {
                if ('const' in sub) return obj[k] === sub.const;
                return true;
            });
            if (matches) {
                errors.push(...validate(schema.then, data, path, rootSchema));
            }
        }
    }

    return errors;
}

function describe(data) {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data;
}

/** @param {object} schema @param {unknown} data */
export function validatePattern(schema, data) {
    return validate(schema, data, '', schema);
}

/**
 * Invariants du profil non couverts par le sous-ensemble JSON Schema :
 * références de verbes/variantes et existence des champs de fichiers.
 *
 * @param {object} schema
 * @param {object} pattern
 * @returns {string[]}
 */
export function validateCoreVerbReferences(schema, pattern) {
    const errors = [];
    const coreVerbs = schema.CORE_VERBS ?? {};
    const composition = Array.isArray(pattern.composition)
        ? pattern.composition
        : [];

    composition.forEach((instance, i) => {
        const verb = instance?.verb;
        const verbDef = coreVerbs[verb];
        if (!verbDef) {
            errors.push(
                `composition[${i}]: verbe "${verb}" absent de CORE_VERBS (pattern-core.schema.json) — noyau ADR-0027 = collection|entity|transition|compositeRead|custom`
            );
            return;
        }
        if (instance.variant) {
            const known = verbDef.variants ?? [];
            if (!known.includes(instance.variant)) {
                errors.push(
                    `composition[${i}]: variant "${instance.variant}" non déclarée dans CORE_VERBS.${verb}.variants [${known.join(', ')}]`
                );
            }
        }
        if (verb === 'custom' && !instance.justification?.trim()) {
            errors.push(
                `composition[${i}]: verb="custom" exige une "justification" non vide (AIP-136, ADR-0027)`
            );
        }
        if (instance.files_field) {
            const value = pattern[instance.files_field];
            if (value === undefined) {
                errors.push(
                    `composition[${i}]: files_field "${instance.files_field}" absent du pattern`
                );
            } else if (
                !Array.isArray(value) &&
                (!value || typeof value !== 'object')
            ) {
                errors.push(
                    `composition[${i}]: files_field "${instance.files_field}" doit référencer un tableau ou un objet de listes`
                );
            }
        }
    });

    return errors;
}

/**
 * Valide la source de vérité CORE_VERBS elle-même, puis vérifie que chaque
 * placeholder employé par un template est déclaré par le verbe.
 *
 * @param {object} schema
 * @returns {string[]}
 */
export function validateCoreVerbRegistry(schema) {
    const errors = [];
    const registrySchema = schema.$defs?.verbRegistry;
    const coreVerbs = schema.CORE_VERBS;

    if (!registrySchema) return ['CORE_VERBS: $defs.verbRegistry absent'];
    if (!coreVerbs || typeof coreVerbs !== 'object') {
        return ['CORE_VERBS: registre absent ou invalide'];
    }

    errors.push(...validate(registrySchema, coreVerbs, 'CORE_VERBS', schema));

    for (const [verb, definition] of Object.entries(coreVerbs)) {
        const declared = new Set(definition.placeholders ?? []);
        const templates = definition.file_templates ?? {};

        for (const [layer, paths] of Object.entries(templates)) {
            if (!Array.isArray(paths)) continue;
            paths.forEach((template, i) => {
                const used =
                    String(template).match(/\{[A-Za-z][A-Za-z0-9_-]*\}/g) ?? [];
                for (const placeholder of used) {
                    if (!declared.has(placeholder)) {
                        errors.push(
                            `CORE_VERBS.${verb}.file_templates.${layer}[${i}]: placeholder ${placeholder} utilisé mais non déclaré`
                        );
                    }
                }
            });
        }
    }

    return errors;
}

function collectPatternPaths(cliArgs) {
    const explicit = cliArgs.filter((a) => !a.startsWith('--'));
    if (explicit.length) return explicit.map((p) => resolve(p));
    return readdirSync(HERE)
        .filter((f) => f.endsWith('.pattern.json'))
        .map((f) => join(HERE, f));
}

function main() {
    const args = process.argv.slice(2);

    if (!existsSync(SCHEMA_PATH)) {
        console.error(
            `[validate-pattern-core] schéma introuvable — ${SCHEMA_PATH}`
        );
        process.exit(2);
    }
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

    const registryErrs = validateCoreVerbRegistry(schema);
    if (registryErrs.length) {
        console.error(
            `[validate-pattern-core] pattern-core.schema.json — ${registryErrs.length} erreur(s) CORE_VERBS :`
        );
        for (const error of registryErrs) console.error(`  - ${error}`);
        process.exit(1);
    }
    console.error('[validate-pattern-core] ✓ CORE_VERBS');

    const files = collectPatternPaths(args);
    if (files.length === 0) {
        console.error(
            '[validate-pattern-core] aucun fichier *.pattern.json trouvé'
        );
        process.exit(2);
    }

    let failures = 0;
    let checked = 0;

    for (const file of files) {
        if (!existsSync(file)) {
            console.error(`[validate-pattern-core] introuvable : ${file}`);
            failures += 1;
            continue;
        }
        checked += 1;
        let obj;
        try {
            obj = JSON.parse(readFileSync(file, 'utf8'));
        } catch (e) {
            console.error(
                `[validate-pattern-core] ${file} — JSON parse: ${e.message}`
            );
            failures += 1;
            continue;
        }

        const schemaErrs = validatePattern(schema, obj);
        const verbErrs = validateCoreVerbReferences(schema, obj);
        const errs = [...schemaErrs, ...verbErrs];

        if (errs.length) {
            console.error(
                `[validate-pattern-core] ${file} — ${errs.length} erreur(s) :`
            );
            for (const e of errs) console.error(`  - ${e}`);
            failures += 1;
        } else {
            console.error(`[validate-pattern-core] ✓ ${file}`);
        }
    }

    if (failures) {
        console.error(
            `\n[validate-pattern-core] FAIL — ${failures}/${checked} fichier(s) en erreur`
        );
        process.exit(1);
    }
    console.error(
        `\n[validate-pattern-core] OK — ${checked} fichier(s) valides`
    );
}

const IS_MAIN =
    process.argv[1] &&
    resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (IS_MAIN) main();
