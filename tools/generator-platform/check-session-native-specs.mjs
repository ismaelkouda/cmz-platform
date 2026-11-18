#!/usr/bin/env node
// Garde de COMPORTEMENT de l'oracle natif des specs de session (F-m14, trous
// B1–B3 de la validation d'E sur c79a5bd0). L'oracle `observatory:test` peut
// sortir en 0 en exécutant moins de specs que prévu : un témoin retiré de
// `sessionSpecs` à l'exécution échappe au test qui lit le texte.
//
// Après l'oracle, les fichiers EXÉCUTÉS (rapport JSON de Vitest, écrit par le
// builder Angular) doivent être exactement les specs PRÉPARÉES
// (session-tests-provenance.json, écrit par prepare-stack-tests.mjs depuis
// `sessionSpecs`), qui doivent elles-mêmes égaler la liste TEXTUELLE de
// `sessionSpecs`. Aucun nombre écrit en dur.
//
// Usage, depuis n'importe quel dossier :
//   node tools/generator-platform/check-session-native-specs.mjs [--dry]
// --dry : vérifie la provenance contre le texte et affiche l'attendu, sans
// lire de rapport (aucune exécution de test).
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
    sessionSpecLists,
    sessionSpecSources,
} from './stack-session-specs.mjs';

const here = import.meta.dirname;
export const nativeView = resolve(
    here,
    '.stack-test-runtime/application-session-native'
);
export const REPORT_FILE = 'session-tests-report.json';

const sorted = (values) => [...values].sort();
const sameList = (left, right) =>
    JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

// Specs préparées : chemins absolus de `include`, contrôlés contre les
// empreintes écrites au même moment et contre la liste textuelle.
export function expectedSessionSpecs(provenance, textNative) {
    const include = provenance?.include;
    if (!Array.isArray(include) || include.length === 0)
        throw new Error('provenance : aucune spec de session préparée');
    const names = include.map((path) => basename(path));
    if (new Set(names).size !== names.length)
        throw new Error('provenance : spec préparée en double');
    if (!sameList(names, Object.keys(provenance.specHashes ?? {})))
        throw new Error('provenance : include et specHashes diffèrent');
    if (!sameList(names, textNative))
        throw new Error(
            `provenance : specs préparées [${sorted(names)}] différentes de sessionSpecs [${sorted(textNative)}]`
        );
    if (provenance.report !== REPORT_FILE)
        throw new Error(`provenance : rapport attendu ${REPORT_FILE}`);
    return include;
}

// Fichiers exécutés : chaque entrée du rapport doit porter au moins un test.
export function executedSessionSpecs(report) {
    if (!Array.isArray(report?.testResults))
        throw new Error('rapport : testResults absent');
    for (const result of report.testResults)
        if (!result.assertionResults?.length)
            throw new Error(
                `rapport : aucun test exécuté dans ${basename(String(result.name))}`
            );
    return report.testResults.map((result) => result.name);
}

export function compareSessionSpecs(expected, executed) {
    const problems = [];
    if (expected.length === 0) problems.push('aucune spec attendue');
    if (executed.length === 0) problems.push('aucune spec exécutée');
    for (const path of expected)
        if (!executed.includes(path))
            problems.push(`spec attendue non exécutée : ${basename(path)}`);
    for (const path of executed)
        if (!expected.includes(path))
            problems.push(`spec exécutée hors de l attendu : ${path}`);
    if (new Set(executed).size !== executed.length)
        problems.push('spec exécutée en double');
    return problems;
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

export async function main(argv = process.argv.slice(2), view = nativeView) {
    if (argv.length > 1 || (argv.length === 1 && argv[0] !== '--dry'))
        throw new Error('argument attendu : [--dry]');
    const { prepare, config } = await sessionSpecSources();
    const expected = expectedSessionSpecs(
        await readJson(resolve(view, 'session-tests-provenance.json')),
        sessionSpecLists(prepare, config).native
    );
    if (argv[0] === '--dry') {
        console.log(
            `attendu (${expected.length}) : ${expected.map((path) => basename(path)).join(', ')}`
        );
        return;
    }
    const executed = executedSessionSpecs(
        await readJson(resolve(view, REPORT_FILE))
    );
    const problems = compareSessionSpecs(expected, executed);
    if (problems.length) throw new Error(problems.join('\n'));
    console.log(
        `✅ oracle natif : ${executed.length} specs de session exécutées, exactement l'attendu.`
    );
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    try {
        await main();
    } catch (error) {
        console.error(`❌ specs de session natives : ${error.message}`);
        process.exitCode = 1;
    }
}
