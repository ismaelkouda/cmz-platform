#!/usr/bin/env node
/**
 * Contrat structurel rapide du corpus SEOS committé.
 *
 * Ce contrôle ne rejoue aucun build Nx : ceux-ci appartiennent à l'Oracle
 * `nx affected`. Il protège les propriétés propres au corpus sur chaque PR :
 * schéma JSONL, identités, rattachement au bon module, pin legacy et chemins
 * Nx présents et confinés dans le workspace.
 */

import {
    existsSync,
    readFileSync,
    readdirSync,
    realpathSync,
    statSync,
} from 'node:fs';
import {
    basename,
    dirname,
    isAbsolute,
    join,
    relative,
    resolve,
} from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePair } from './validate-pair-schema.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function isInside(root, candidate) {
    const rel = relative(root, candidate);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function safeRelativePath(value) {
    return (
        typeof value === 'string' &&
        value.length > 0 &&
        !isAbsolute(value) &&
        !value.includes('\\') &&
        !value.split('/').includes('..')
    );
}

/**
 * @param {{root?: string, corpusDir?: string, schemaPath?: string, legacyLockPath?: string}} [options]
 */
export function validateCorpusContract(options = {}) {
    const root = resolve(options.root ?? ROOT);
    const corpusDir = resolve(options.corpusDir ?? join(root, 'corpus'));
    const schemaPath = resolve(
        options.schemaPath ??
            join(root, 'docs/architecture/corpus/pair.schema.json')
    );
    const legacyLockPath = resolve(
        options.legacyLockPath ?? join(root, 'legacy.lock.json')
    );
    const errors = [];
    const ids = new Map();
    let pairs = 0;
    let nxPaths = 0;

    if (!existsSync(corpusDir) || !statSync(corpusDir).isDirectory()) {
        return {
            ok: false,
            errors: [`dossier corpus absent : ${corpusDir}`],
            files: 0,
            pairs: 0,
            nxPaths: 0,
        };
    }
    if (!existsSync(schemaPath)) {
        return {
            ok: false,
            errors: [`schéma corpus absent : ${schemaPath}`],
            files: 0,
            pairs: 0,
            nxPaths: 0,
        };
    }
    if (!existsSync(legacyLockPath)) {
        return {
            ok: false,
            errors: [`legacy.lock.json absent : ${legacyLockPath}`],
            files: 0,
            pairs: 0,
            nxPaths: 0,
        };
    }

    let schema;
    let legacyLock;
    try {
        schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    } catch (error) {
        errors.push(`schéma corpus JSON invalide : ${error.message}`);
    }
    try {
        legacyLock = JSON.parse(readFileSync(legacyLockPath, 'utf8'));
    } catch (error) {
        errors.push(`legacy.lock.json invalide : ${error.message}`);
    }
    if (!schema || !legacyLock) {
        return { ok: false, errors, files: 0, pairs, nxPaths };
    }

    const files = readdirSync(corpusDir)
        .filter((file) => file.endsWith('.pairs.jsonl'))
        .sort();
    if (files.length === 0) errors.push('aucun fichier corpus/*.pairs.jsonl');

    const canonicalRoot = realpathSync(root);
    for (const file of files) {
        const moduleName = basename(file, '.pairs.jsonl');
        const path = join(corpusDir, file);
        const lines = readFileSync(path, 'utf8')
            .split(/\r?\n/)
            .filter((line) => line.trim());
        if (lines.length === 0) errors.push(`${file}: fichier vide`);

        for (const [index, line] of lines.entries()) {
            const label = `${file}:${index + 1}`;
            pairs += 1;
            let pair;
            try {
                pair = JSON.parse(line);
            } catch (error) {
                errors.push(`${label}: JSON invalide (${error.message})`);
                continue;
            }

            for (const error of validatePair(schema, pair)) {
                errors.push(`${label}: schéma ${error}`);
            }

            if (pair.module !== moduleName) {
                errors.push(
                    `${label}: module « ${pair.module ?? '?'} » différent du fichier « ${moduleName} »`
                );
            }
            if (typeof pair.id === 'string') {
                const first = ids.get(pair.id);
                if (first) {
                    errors.push(
                        `${label}: id dupliqué « ${pair.id} » (déjà ${first})`
                    );
                } else {
                    ids.set(pair.id, label);
                }
            }

            if (
                pair.legacy_ref?.commit &&
                pair.legacy_ref.commit !== legacyLock.commit
            ) {
                errors.push(
                    `${label}: legacy_ref.commit différent de legacy.lock.json#commit`
                );
            }

            if (pair.nx === null || pair.nx === undefined) continue;
            nxPaths += 1;
            if (!safeRelativePath(pair.nx)) {
                errors.push(
                    `${label}: chemin nx non relatif ou traversant « ${pair.nx} »`
                );
                continue;
            }
            const nxPath = resolve(root, pair.nx);
            if (!isInside(root, nxPath)) {
                errors.push(
                    `${label}: chemin nx hors workspace « ${pair.nx} »`
                );
                continue;
            }
            if (!existsSync(nxPath)) {
                errors.push(`${label}: chemin nx absent « ${pair.nx} »`);
                continue;
            }
            const canonicalNxPath = realpathSync(nxPath);
            if (!isInside(canonicalRoot, canonicalNxPath)) {
                errors.push(
                    `${label}: chemin nx sort du workspace via lien symbolique « ${pair.nx} »`
                );
            }
        }
    }

    return {
        ok: errors.length === 0,
        errors,
        files: files.length,
        pairs,
        nxPaths,
    };
}

function main() {
    const result = validateCorpusContract();
    if (!result.ok) {
        console.error(
            `[check:corpus-contract] FAIL — ${result.errors.length} erreur(s)`
        );
        for (const error of result.errors) console.error(`  - ${error}`);
        process.exit(1);
    }
    console.log(
        `[check:corpus-contract] OK — ${result.files} fichier(s), ${result.pairs} paire(s), ${result.nxPaths} chemin(s) Nx vérifié(s)`
    );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
