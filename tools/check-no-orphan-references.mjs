#!/usr/bin/env node
/**
 * check-no-orphan-references.mjs
 *
 * Vérifie qu'un module retiré du repo (apps/libs supprimés) ne laisse
 * aucune référence orpheline dans le code, la config, ou les tests —
 * seules les occurrences exactes enregistrées dans un tombstone versionné
 * sont tolérées.
 *
 * Complément direct de tools/retire-module.mjs (audit staff, 2026-08-29) :
 * la vision du projet est de minimiser l'action humaine, donc une
 * suppression de module ne doit jamais reposer sur un audit manuel (grep
 * ad hoc, relecture fichier par fichier) — elle doit produire une preuve
 * automatique, rejouable en CI, de son exhaustivité.
 *
 * Usage :
 *   node tools/check-no-orphan-references.mjs --module <nom>
 *   node tools/check-no-orphan-references.mjs --module <nom> --tombstone docs/architecture/removed-modules/<nom>.json
 *   node tools/check-no-orphan-references.mjs --module <nom> --create-tombstone docs/architecture/removed-modules/<nom>.json --historical-reference docs/adr/example.md::<occurrence-sha256>::raison
 *
 * Recherche toutes les formes canoniques dérivables de <nom> : kebab-case,
 * snake_case, camelCase et PascalCase, y compris lorsqu'une forme PascalCase
 * est imbriquée dans un identifiant (ex: executeSampleModule). Cela couvre
 * aussi les alias @cmz/<nom>-* et tags Nx scope:<nom>-*.
 *
 * Périmètre : l'inventaire canonique Git, soit tous les fichiers suivis et
 * tous les fichiers non suivis non ignorés. Il n'existe aucun filtre
 * d'extension et aucun dossier métier spécial : corpus, dotfiles, scripts,
 * lockfiles et fichiers binaires sont inspectés. Les fichiers ignorés par Git
 * sont hors preuve par contrat puisqu'ils ne peuvent pas entrer en CI sans
 * changer d'état Git. Les liens symboliques sont inspectés comme liens (chemin
 * + cible) et ne sont jamais suivis.
 *
 * Chaque tombstone identifie une occurrence par motif, texte, index logique et
 * hashes SHA-256 de ligne/contexte. Une nouvelle occurrence dans le même
 * fichier n'est jamais blanchie. Les anciennes allowlists de fichier entier
 * sont refusées. Exit 1 pour toute occurrence nouvelle ou tombstone périmé.
 */

import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    existsSync,
    closeSync,
    fsyncSync,
    lstatSync,
    linkSync,
    mkdirSync,
    openSync,
    readFileSync,
    readlinkSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

function parseArgs(argv) {
    const options = { historicalReferences: [], activeReferences: [] };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--module') options.module = argv[++i];
        else if (arg === '--tombstone') options.tombstone = argv[++i];
        else if (arg === '--create-tombstone')
            options.createTombstone = argv[++i];
        else if (arg === '--historical-reference')
            options.historicalReferences.push(argv[++i]);
        else if (arg === '--active-reference')
            options.activeReferences.push(argv[++i]);
        else if (arg === '--allow' || arg === '--allow-active-fixture')
            fail(
                `${arg} est interdit : une allowlist de fichier blanchit des occurrences non relues. ` +
                    `Utilise un tombstone d'occurrences exactes.`
            );
        else fail(`Argument inconnu : ${arg}`);
    }
    if (!options.module) fail('--module <nom> est requis.');
    if (!/^[a-z][a-z0-9-]*$/.test(options.module))
        fail(
            '--module doit être un identifiant kebab-case (ex: content-management).'
        );
    if (options.tombstone && options.createTombstone)
        fail('--tombstone et --create-tombstone sont mutuellement exclusifs.');
    if (
        !options.createTombstone &&
        (options.historicalReferences.length > 0 ||
            options.activeReferences.length > 0)
    )
        fail(
            '--historical-reference/--active-reference exigent --create-tombstone.'
        );
    const specifications = [
        ...options.historicalReferences,
        ...options.activeReferences,
    ];
    for (const specification of specifications) {
        const parts = specification?.split('::') ?? [];
        if (
            parts.length !== 3 ||
            !parts[0] ||
            !SHA256_RE.test(parts[1] || '') ||
            !parts[2].trim()
        )
            fail(
                `Référence invalide "${specification || ''}" : format exact attendu ` +
                    `chemin::occurrence-sha256::raison.`
            );
    }
    const paths = [
        options.tombstone,
        options.createTombstone,
        ...specifications.map((value) => value.split('::')[0]),
    ].filter(Boolean);
    for (const path of paths) {
        if (!path) fail('Une option d’exemption attend un chemin.');
        const absolute = resolve(ROOT, path);
        if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${sep}`))
            fail(`Chemin d’exemption hors workspace refusé : ${path}`);
    }
    return options;
}

function fail(message) {
    console.error(`\n✖ ${message}\n`);
    process.exit(1);
}

function gitBuffer(args) {
    try {
        return execFileSync('git', args, {
            cwd: ROOT,
            encoding: 'buffer',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (error) {
        const details = Buffer.concat([
            Buffer.isBuffer(error.stdout) ? error.stdout : Buffer.alloc(0),
            Buffer.isBuffer(error.stderr) ? error.stderr : Buffer.alloc(0),
        ])
            .toString('utf8')
            .trim();
        fail(
            `Impossible d'établir l'inventaire Git canonique${details ? ` : ${details}` : '.'}`
        );
    }
}

function parseNullSeparatedPaths(buffer, label) {
    const paths = buffer.toString('utf8').split('\0').filter(Boolean);
    if (paths.some((path) => path.includes('\uFFFD'))) {
        fail(`${label} contient un chemin qui n'est pas UTF-8.`);
    }
    return paths;
}

/**
 * Git est l'autorité de périmètre : tracked + untracked non ignoré. Un fichier
 * ignoré ne peut pas contaminer le commit/CI ; un fichier nouvellement suivi
 * entre automatiquement dans cet inventaire, quelle que soit son extension.
 */
function buildWorkspaceInventory() {
    const topLevel = gitBuffer(['rev-parse', '--show-toplevel'])
        .toString('utf8')
        .trim();
    if (resolve(topLevel) !== resolve(ROOT)) {
        fail(
            `Le script doit s'exécuter à la racine du worktree Git : ${topLevel || 'racine introuvable'}`
        );
    }

    const indexedAndUntrackedPaths = parseNullSeparatedPaths(
        gitBuffer([
            'ls-files',
            '--cached',
            '--others',
            '--exclude-standard',
            '-z',
        ]),
        'L’inventaire Git'
    );
    const deletedPaths = parseNullSeparatedPaths(
        gitBuffer(['ls-files', '--deleted', '-z']),
        'L’inventaire des suppressions Git'
    ).sort();
    const deletedSet = new Set(deletedPaths);
    const relativePaths = indexedAndUntrackedPaths
        .filter((path) => !deletedSet.has(path))
        .sort();
    if (new Set(relativePaths).size !== relativePaths.length) {
        fail(`L'inventaire Git contient des chemins dupliqués.`);
    }

    const ignoredEntries = parseNullSeparatedPaths(
        gitBuffer([
            'ls-files',
            '--others',
            '--ignored',
            '--exclude-standard',
            '--directory',
            '-z',
        ]),
        'L’inventaire des fichiers ignorés'
    );

    const entries = relativePaths.map((relativePath) => {
        if (
            relativePath.startsWith('/') ||
            relativePath.split('/').includes('..') ||
            [...relativePath].some((character) => {
                const codePoint = character.codePointAt(0);
                return codePoint <= 31 || codePoint === 127;
            })
        ) {
            fail(`Chemin Git non sûr : ${relativePath}`);
        }
        const absolutePath = resolve(ROOT, relativePath);
        if (
            absolutePath === ROOT ||
            !absolutePath.startsWith(`${resolve(ROOT)}${sep}`)
        ) {
            fail(`Chemin Git hors workspace : ${relativePath}`);
        }
        let metadata;
        try {
            metadata = lstatSync(absolutePath);
        } catch (error) {
            fail(
                `Entrée Git inaccessible ${relativePath} : ${error.code || error.message}`
            );
        }
        if (!metadata.isFile() && !metadata.isSymbolicLink()) {
            fail(
                `Entrée Git non inspectable ${relativePath} : seuls les fichiers réguliers et liens symboliques sont admis.`
            );
        }
        return {
            absolutePath,
            relativePath,
            kind: metadata.isSymbolicLink() ? 'symlink' : 'file',
        };
    });

    return { entries, ignoredEntries, deletedPaths };
}

function decodeFile(buffer) {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
        return buffer.subarray(2).toString('utf16le');
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        const swapped = Buffer.from(buffer.subarray(2));
        for (let i = 0; i + 1 < swapped.length; i += 2) {
            const byte = swapped[i];
            swapped[i] = swapped[i + 1];
            swapped[i + 1] = byte;
        }
        return swapped.toString('utf16le');
    }
    if (buffer.length >= 8) {
        let evenNulls = 0;
        let oddNulls = 0;
        for (let i = 0; i < buffer.length; i += 1) {
            if (buffer[i] === 0) {
                if (i % 2 === 0) evenNulls += 1;
                else oddNulls += 1;
            }
        }
        if (oddNulls > buffer.length / 4) return buffer.toString('utf16le');
        if (evenNulls > buffer.length / 4) {
            const swapped = Buffer.from(buffer);
            for (let i = 0; i + 1 < swapped.length; i += 2) {
                const byte = swapped[i];
                swapped[i] = swapped[i + 1];
                swapped[i + 1] = byte;
            }
            return swapped.toString('utf16le');
        }
    }
    return buffer.toString('utf8');
}

function readEntry(entry) {
    try {
        return entry.kind === 'symlink'
            ? readlinkSync(entry.absolutePath)
            : decodeFile(readFileSync(entry.absolutePath));
    } catch (error) {
        fail(
            `Lecture impossible ${entry.relativePath} (${entry.kind}) : ${error.code || error.message}`
        );
    }
}

/**
 * Construit les motifs de recherche pour un module retiré. On ne peut
 * plus dériver ces alias du filesystem (le module a été supprimé) — on
 * les dérive donc du NOM fourni, en couvrant les formes canoniques que
 * ADR-0003 impose pour tout module (@cmz/<module>-<couche>, scope:<module>).
 */
function buildPatterns(moduleName) {
    const words = moduleName.split('-');
    const capitalize = (word) => `${word[0].toUpperCase()}${word.slice(1)}`;
    const pascalCase = words.map(capitalize).join('');
    const camelCase = `${words[0]}${words.slice(1).map(capitalize).join('')}`;
    const separatorForms = [moduleName, words.join('_')]
        .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
    return [
        {
            type: 'separator',
            regex: new RegExp(
                `(?<![a-z0-9])(?:${separatorForms})(?![a-z0-9])`,
                'i'
            ),
        },
        {
            type: 'camel',
            regex: new RegExp(`(?<![a-z0-9])${camelCase}(?=$|[^a-z0-9]|[A-Z])`),
        },
        {
            type: 'pascal',
            regex: new RegExp(`${pascalCase}(?=$|[^a-z0-9]|[A-Z])`),
        },
    ];
}

function matchesAny(patterns, value) {
    return patterns.some((pattern) => pattern.regex.test(value));
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function findMatches(patterns, value) {
    const matches = [];
    const positions = new Set();
    for (const pattern of patterns) {
        const flags = pattern.regex.flags.includes('g')
            ? pattern.regex.flags
            : `${pattern.regex.flags}g`;
        for (const match of value.matchAll(
            new RegExp(pattern.regex.source, flags)
        )) {
            const key = `${match.index}:${match[0].length}`;
            if (positions.has(key)) continue;
            positions.add(key);
            matches.push({
                pattern: pattern.type,
                match: match[0],
                index: match.index,
            });
        }
    }
    return matches.sort(
        (a, b) => a.index - b.index || (a.match < b.match ? -1 : 1)
    );
}

function occurrenceKey(occurrence, includeContextOccurrence = true) {
    const fields = [
        occurrence.file,
        occurrence.location,
        occurrence.pattern,
        occurrence.match,
        occurrence.logicalLineSha256,
        occurrence.contextSha256,
        occurrence.occurrence,
    ];
    if (includeContextOccurrence) fields.push(occurrence.contextOccurrence);
    return fields.join('\0');
}

function occurrenceApprovalId(occurrence) {
    return sha256(occurrenceKey(occurrence));
}

function collectOccurrences(entry, patterns, content) {
    const occurrences = [];
    for (const [occurrence, match] of findMatches(
        patterns,
        entry.relativePath
    ).entries()) {
        occurrences.push({
            file: entry.relativePath,
            location: 'path',
            pattern: match.pattern,
            match: match.match,
            logicalLineSha256: sha256(entry.relativePath),
            contextSha256: sha256(`path\0${entry.relativePath}`),
            occurrence,
            lineHint: null,
            columnHint: match.index + 1,
        });
    }

    const lines = content.split('\n');
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const context = [
            lines[lineIndex - 1]?.trim() || '',
            line.trim(),
            lines[lineIndex + 1]?.trim() || '',
        ].join('\0');
        for (const [occurrence, match] of findMatches(
            patterns,
            line
        ).entries()) {
            occurrences.push({
                file: entry.relativePath,
                location:
                    entry.kind === 'symlink' ? 'symlink-target' : 'content',
                pattern: match.pattern,
                match: match.match,
                logicalLineSha256: sha256(line.trim()),
                contextSha256: sha256(context),
                occurrence,
                lineHint: lineIndex + 1,
                columnHint: match.index + 1,
            });
        }
    }

    const seen = new Map();
    return occurrences.map((item) => {
        const baseKey = occurrenceKey(item, false);
        const contextOccurrence = seen.get(baseKey) || 0;
        seen.set(baseKey, contextOccurrence + 1);
        return { ...item, contextOccurrence };
    });
}

function safeExcerpt(value) {
    return JSON.stringify(value.trim().slice(0, 160)).slice(1, -1);
}

function normalizeRepoPath(path) {
    return relative(ROOT, resolve(ROOT, path)).split(sep).join('/');
}

function expectedTombstonePath(moduleName) {
    return `docs/architecture/removed-modules/${moduleName}.json`;
}

function parseReferenceSpecifications(options, occurrences) {
    const occurrenceBySelector = new Map(
        occurrences.map((occurrence) => [
            `${occurrence.file}\0${occurrenceApprovalId(occurrence)}`,
            occurrence,
        ])
    );
    const result = new Map();
    for (const [category, values] of [
        ['historical', options.historicalReferences],
        ['active', options.activeReferences],
    ]) {
        for (const value of values) {
            const [rawFile, approvalId, rawReason] = value.split('::');
            const file = normalizeRepoPath(rawFile);
            const reason = rawReason.trim();
            const occurrence = occurrenceBySelector.get(
                `${file}\0${approvalId}`
            );
            if (!occurrence)
                fail(
                    `Classification inconnue ou périmée pour ${file} ` +
                        `(occurrence ${approvalId}). Relance le check pour obtenir ` +
                        `les identifiants courants.`
                );
            const key = occurrenceKey(occurrence);
            if (result.has(key))
                fail(
                    `Classification dupliquée pour ${file} ` +
                        `(occurrence ${approvalId}).`
                );
            result.set(key, { category, reason });
        }
    }
    return result;
}

const SHA256_RE = /^[a-f0-9]{64}$/;
const REFERENCE_FIELDS = new Set([
    'file',
    'location',
    'pattern',
    'match',
    'logicalLineSha256',
    'contextSha256',
    'occurrence',
    'contextOccurrence',
    'lineHint',
    'columnHint',
    'category',
    'reason',
]);

function validateTombstone(value, moduleName, source) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        fail(`Tombstone invalide ${source} : objet JSON attendu.`);
    const rootFields = Object.keys(value).sort().join(',');
    if (rootFields !== 'createdAt,module,references,version')
        fail(`Tombstone invalide ${source} : schéma racine exact requis.`);
    if (value.version !== 1 || value.module !== moduleName)
        fail(`Tombstone invalide ${source} : version/module incohérent.`);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.createdAt))
        fail(`Tombstone invalide ${source} : createdAt ISO-8601 UTC requis.`);
    if (!Array.isArray(value.references))
        fail(`Tombstone invalide ${source} : references doit être un tableau.`);

    const keys = new Set();
    for (const [index, reference] of value.references.entries()) {
        if (
            !reference ||
            typeof reference !== 'object' ||
            Array.isArray(reference)
        )
            fail(`Tombstone invalide ${source} : reference ${index} invalide.`);
        const fields = Object.keys(reference);
        if (
            fields.length !== REFERENCE_FIELDS.size ||
            fields.some((field) => !REFERENCE_FIELDS.has(field))
        )
            fail(
                `Tombstone invalide ${source} : schéma exact requis pour reference ${index}.`
            );
        if (
            typeof reference.file !== 'string' ||
            normalizeRepoPath(reference.file) !== reference.file ||
            !['path', 'content', 'symlink-target'].includes(
                reference.location
            ) ||
            !['separator', 'camel', 'pascal'].includes(reference.pattern) ||
            typeof reference.match !== 'string' ||
            !reference.match ||
            !SHA256_RE.test(reference.logicalLineSha256) ||
            !SHA256_RE.test(reference.contextSha256) ||
            !Number.isSafeInteger(reference.occurrence) ||
            reference.occurrence < 0 ||
            !Number.isSafeInteger(reference.contextOccurrence) ||
            reference.contextOccurrence < 0 ||
            !['historical', 'active'].includes(reference.category) ||
            typeof reference.reason !== 'string' ||
            !reference.reason.trim() ||
            !(
                reference.lineHint === null ||
                (Number.isSafeInteger(reference.lineHint) &&
                    reference.lineHint > 0)
            ) ||
            !Number.isSafeInteger(reference.columnHint) ||
            reference.columnHint < 1
        )
            fail(
                `Tombstone invalide ${source} : reference ${index} mal formée.`
            );
        const key = occurrenceKey(reference);
        if (keys.has(key))
            fail(
                `Tombstone invalide ${source} : occurrence dupliquée à l'index ${index}.`
            );
        keys.add(key);
    }
    return value;
}

function readTombstone(path, moduleName) {
    let parsed;
    try {
        const absolutePath = resolve(ROOT, path);
        const metadata = lstatSync(absolutePath);
        if (!metadata.isFile() || metadata.isSymbolicLink())
            fail(
                `Tombstone non régulier refusé ${path} : la preuve doit être ` +
                    `un fichier physique versionnable du workspace.`
            );
        parsed = JSON.parse(readFileSync(absolutePath, 'utf8'));
    } catch (error) {
        fail(`Lecture du tombstone impossible ${path} : ${error.message}`);
    }
    return validateTombstone(parsed, moduleName, path);
}

function writeTombstone(path, tombstone) {
    const absolutePath = resolve(ROOT, path);
    if (existsSync(absolutePath))
        fail(`Refus d'écraser le tombstone existant : ${path}.`);
    const parentPath = dirname(absolutePath);
    const parentRelative = relative(ROOT, parentPath);
    let cursor = ROOT;
    for (const component of parentRelative.split(sep).filter(Boolean)) {
        cursor = resolve(cursor, component);
        if (!existsSync(cursor)) mkdirSync(cursor, { mode: 0o755 });
        const metadata = lstatSync(cursor);
        if (!metadata.isDirectory() || metadata.isSymbolicLink())
            fail(
                `Parent de tombstone non régulier refusé : ${relative(ROOT, cursor)}.`
            );
    }
    const temporary = `${absolutePath}.tmp-${process.pid}-${randomUUID()}`;
    let fd;
    try {
        fd = openSync(temporary, 'wx', 0o600);
        writeFileSync(fd, `${JSON.stringify(tombstone, null, 2)}\n`);
        fsyncSync(fd);
        closeSync(fd);
        fd = undefined;
        // link(2) publie sans écrasement : deux créateurs concurrents ne
        // peuvent jamais gagner tous les deux, contrairement à rename(2).
        linkSync(temporary, absolutePath);
        rmSync(temporary);
        const parent = openSync(parentPath, 'r');
        fsyncSync(parent);
        closeSync(parent);
    } catch (error) {
        if (fd !== undefined) closeSync(fd);
        rmSync(temporary, { force: true });
        fail(
            `Écriture atomique du tombstone échouée ${path} : ${error.message}`
        );
    }
}

function renderOccurrence(occurrence) {
    const position =
        occurrence.lineHint === null
            ? occurrence.file
            : `${occurrence.file}:${occurrence.lineHint}:${occurrence.columnHint}`;
    return (
        `${position}\n` +
        `    [${occurrence.location}/${occurrence.pattern}] ${safeExcerpt(occurrence.match)}\n` +
        `    occurrence-sha256: ${occurrenceApprovalId(occurrence)}`
    );
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const patterns = buildPatterns(options.module);
    const inventory = buildWorkspaceInventory();
    const entriesByPath = new Map(
        inventory.entries.map((entry) => [entry.relativePath, entry])
    );

    const tombstonePath = normalizeRepoPath(
        options.tombstone ||
            options.createTombstone ||
            expectedTombstonePath(options.module)
    );
    if (
        (options.tombstone || options.createTombstone) &&
        tombstonePath !== expectedTombstonePath(options.module)
    )
        fail(
            `Emplacement canonique requis : ${expectedTombstonePath(options.module)}.`
        );
    if (options.tombstone) {
        const entry = entriesByPath.get(tombstonePath);
        if (!entry || entry.kind !== 'file')
            fail(
                `Le tombstone canonique doit être un fichier régulier présent ` +
                    `dans l'inventaire Git : ${tombstonePath}.`
            );
    }

    const occurrences = [];
    let scannedEntries = 0;
    for (const entry of inventory.entries) {
        if (entry.relativePath === tombstonePath) continue;
        scannedEntries += 1;
        const content = readEntry(entry);
        occurrences.push(...collectOccurrences(entry, patterns, content));
    }

    let tombstone;
    if (options.createTombstone) {
        const classifications = parseReferenceSpecifications(
            options,
            occurrences
        );
        for (const specification of [
            ...options.historicalReferences,
            ...options.activeReferences,
        ]) {
            const file = normalizeRepoPath(specification.split('::')[0]);
            const entry = entriesByPath.get(file);
            if (!entry)
                fail(`Référence classifiée hors inventaire Git : ${file}.`);
            if (entry.kind !== 'file')
                fail(
                    `Une référence classifiée doit être un fichier régulier : ${file}.`
                );
        }
        const unclassified = occurrences.filter(
            (occurrence) => !classifications.has(occurrenceKey(occurrence))
        );
        if (unclassified.length > 0) {
            console.error(
                `\n❌  ${unclassified.length} occurrence(s) non classifiée(s) :\n`
            );
            for (const occurrence of unclassified)
                console.error(`  ${renderOccurrence(occurrence)}`);
            fail(
                'Tombstone non créé : chaque occurrence doit être classifiée explicitement.'
            );
        }
        tombstone = {
            version: 1,
            module: options.module,
            createdAt: new Date().toISOString(),
            references: occurrences
                .map((occurrence) => ({
                    ...occurrence,
                    ...classifications.get(occurrenceKey(occurrence)),
                }))
                .sort((a, b) =>
                    occurrenceKey(a).localeCompare(occurrenceKey(b))
                ),
        };
        validateTombstone(tombstone, options.module, tombstonePath);
        writeTombstone(tombstonePath, tombstone);
        console.log(
            `Tombstone créé : ${tombstonePath} (${tombstone.references.length} occurrences exactes).`
        );
    } else if (options.tombstone) {
        tombstone = readTombstone(tombstonePath, options.module);
    }

    const approved = new Map(
        (tombstone?.references || []).map((reference) => [
            occurrenceKey(reference),
            reference,
        ])
    );
    const actual = new Map(
        occurrences.map((occurrence) => [occurrenceKey(occurrence), occurrence])
    );
    const violations = occurrences.filter(
        (occurrence) => !approved.has(occurrenceKey(occurrence))
    );
    const stale = [...approved].filter(([key]) => !actual.has(key));

    if (violations.length === 0 && stale.length === 0) {
        console.log(
            `✅  check:no-orphan-references — aucune référence non approuvée à "${options.module}" ` +
                `(${scannedEntries} entrées Git inspectées sans filtre d'extension, ` +
                `${inventory.deletedPaths.length} suppressions Git prouvées absentes, ` +
                `${inventory.ignoredEntries.length} entrées ignorées par Git hors preuve, ` +
                `0 exclusion interne, ` +
                `${approved.size} occurrences exactes approuvées)`
        );
        process.exit(0);
    }

    console.error(
        `\n❌  ${violations.length} occurrence(s) non approuvée(s) et ${stale.length} tombstone(s) périmé(s) pour "${options.module}" :\n`
    );
    for (const occurrence of violations)
        console.error(`  NON APPROUVÉE ${renderOccurrence(occurrence)}`);
    for (const [, reference] of stale)
        console.error(
            `  PÉRIMÉE ${renderOccurrence(reference)}\n    raison: ${safeExcerpt(reference.reason)}`
        );
    console.error(
        `\nInventaire : ${scannedEntries} entrées Git inspectées sans filtre d'extension ; ` +
            `${inventory.deletedPaths.length} suppressions Git prouvées absentes ; ` +
            `${inventory.ignoredEntries.length} entrées ignorées par Git hors preuve ; ` +
            `0 exclusion interne.`
    );
    console.error(
        `\nNettoie les occurrences non approuvées. Si une occurrence doit survivre, ` +
            `recrée explicitement le tombstone canonique après revue : aucune exemption de fichier entier n'est admise.\n`
    );
    process.exit(1);
}

main();
