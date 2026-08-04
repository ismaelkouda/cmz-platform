#!/usr/bin/env node
/**
 * SEOS — Pattern conformance checker (Etape "Validation Engine", zero IA).
 *
 * Verifie qu'une unite (entite CRUD ou operation action-request) respecte le pattern
 * canonique extrait experimentalement du module de reference declare dans le schema
 * (voir SEOS-Assumptions-Register.md).
 *
 * Generalise (Experience 050) pour accepter un schema arbitraire via --schema, en plus
 * du schema crud-entity.pattern.json historique (defaut, comportement inchange si
 * --schema est omis). Le placeholder par-unite ({ENTITY} pour crud-entity, {OPERATION}
 * pour action-request) est detecte automatiquement a partir du contenu du schema —
 * chaque schema n'utilise jamais les deux a la fois, donc aucune ambiguite, et aucun
 * nouvel argument CLI n'est necessaire (meme logique que la derivation de {MODULE}
 * depuis le chemin du module, deja en place).
 *
 * Usage:
 *   node check-pattern.js <chemin-du-module> <nom-unite> [--schema <chemin-du-schema>]
 *
 * Exemple (crud-entity, schema par defaut) :
 *   node check-pattern.js src/presentation/pages/administrative-boundary departments
 *
 * Exemple (action-request, schema explicite) :
 *   node check-pattern.js src/presentation/pages/authentication login --schema seos/patterns/action-request.pattern.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawArgs = process.argv.slice(2);
const schemaFlagIndex = rawArgs.indexOf('--schema');
let schemaPath = path.join(__dirname, '..', 'patterns', 'crud-entity.pattern.json');
const positional = [...rawArgs];
if (schemaFlagIndex !== -1) {
    const explicit = rawArgs[schemaFlagIndex + 1];
    if (!explicit) {
        console.error('Erreur : --schema requiert un chemin (ex: --schema seos/patterns/action-request.pattern.json)');
        process.exit(1);
    }
    schemaPath = path.resolve(explicit);
    positional.splice(schemaFlagIndex, 2);
}

const [moduleRoot, unitName] = positional;
const spec = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

if (!moduleRoot || !unitName) {
    console.error('Usage: node check-pattern.js <chemin-du-module> <nom-unite> [--schema <chemin-du-schema>]');
    process.exit(1);
}

if (!fs.existsSync(moduleRoot)) {
    console.error(
        `Erreur : le chemin "${moduleRoot}" n'existe pas depuis le dossier courant (${process.cwd()}).\n` +
        `Le premier argument doit etre le chemin RELATIF COMPLET vers le dossier du module, par exemple :\n` +
        `  node seos/tools/check-pattern.js src/presentation/pages/administrative-infrastructure infrastructure\n` +
        `(et non juste le nom du module, ex: "administrative-infrastructure")`
    );
    process.exit(2);
}

// Detection automatique du placeholder par-unite utilise par ce schema — {ENTITY}
// (crud-entity, historique) ou {OPERATION} (action-request). Un schema n'utilise
// jamais les deux formes a la fois.
const unitPlaceholder = spec.core_files.some((f) => f.includes('{OPERATION}'))
    ? 'OPERATION'
    : 'ENTITY';

function resolveTemplate(tpl, unit, moduleName) {
    return tpl
        .replace(new RegExp(`\\{${unitPlaceholder}\\}`, 'g'), unit)
        .replace(/\{MODULE\}/g, moduleName);
}

// {MODULE} = nom du dossier du module lui-meme (ex: "administrative-infrastructure"),
// derive du chemin passe en argument — pas un 3e argument CLI separe. Necessaire pour
// les fichiers racine du module (ex: di/{MODULE}.providers.ts) dont le nom suit le
// module entier, pas une entite/operation individuelle (voir Experience 047).
const moduleName = path.basename(path.resolve(moduleRoot));

const missing = [];
const present = [];

for (const tpl of spec.core_files) {
    const rel = resolveTemplate(tpl, unitName, moduleName);
    const abs = path.join(moduleRoot, rel);
    if (fs.existsSync(abs)) {
        present.push(rel);
    } else {
        missing.push(rel);
    }
}

const total = spec.core_files.length;
const score = ((present.length / total) * 100).toFixed(1);

console.log(`SEOS — verification du pattern "${spec.pattern}" (${spec.lineage})`);
console.log(`Module : ${moduleRoot}`);
console.log(`${unitPlaceholder === 'OPERATION' ? 'Operation' : 'Entite'} : ${unitName}`);
console.log(`Conformite : ${present.length}/${total} fichiers du coeur presents (${score}%)`);

if (missing.length > 0) {
    console.log(`\nFichiers manquants (${missing.length}) :`);
    for (const m of missing) {
        console.log(`  - ${m}`);
    }
    process.exitCode = 1;
} else {
    console.log('\nAucun fichier du coeur manquant.');
}

const deviationNote =
    typeof spec.known_deviation === 'string'
        ? spec.known_deviation
        : JSON.stringify(spec.known_deviation, null, 2);

console.log(
    `\nNote : ce script ne verifie que la PRESENCE des fichiers (Pattern, fait structurel), jamais leur contenu ni une "Intent" metier — conformement a la separation connaissance observee / declaree (SEOS-Research-Charter.md, section 4). Deviation connue du schema : ${deviationNote}`
);
