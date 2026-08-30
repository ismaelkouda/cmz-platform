#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import {
    buildUpdatedTombstone,
    publishTombstone,
} from './orphan-tombstone-update.mjs';
import {
    buildPatterns,
    collectOccurrences,
    decodeFile,
    occurrenceApprovalId,
    occurrenceKey,
    safeExcerpt,
    sha256,
} from './orphan-occurrence.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

function parseArgs(argv) {
    const options = {
        historicalReferences: [],
        activeReferences: [],
        retainSourceDefinition: false,
    };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--module') options.module = argv[++i];
        else if (arg === '--tombstone') options.tombstone = argv[++i];
        else if (arg === '--create-tombstone')
            options.createTombstone = argv[++i];
        else if (arg === '--update-tombstone')
            options.updateTombstone = argv[++i];
        else if (arg === '--historical-reference')
            options.historicalReferences.push(argv[++i]);
        else if (arg === '--active-reference')
            options.activeReferences.push(argv[++i]);
        else if (
            arg === '--retain-source-definition' &&
            !options.retainSourceDefinition
        )
            options.retainSourceDefinition = true;
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
    if (
        [
            options.tombstone,
            options.createTombstone,
            options.updateTombstone,
        ].filter(Boolean).length > 1
    )
        fail('Les modes de tombstone sont mutuellement exclusifs.');
    if (
        !options.createTombstone &&
        !options.updateTombstone &&
        (options.historicalReferences.length > 0 ||
            options.activeReferences.length > 0)
    )
        fail(
            '--historical-reference/--active-reference exigent --create-tombstone ou --update-tombstone.'
        );
    if (options.retainSourceDefinition && !options.createTombstone)
        fail('--retain-source-definition exige --create-tombstone.');
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
        options.updateTombstone,
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

function discoverLongerModulePatterns(entries, moduleName) {
    const modules = new Set();
    for (const entry of entries) {
        const retired =
            /^docs\/architecture\/removed-modules\/([a-z][a-z0-9-]*)\.json$/.exec(
                entry.relativePath
            )?.[1];
        if (retired?.startsWith(`${moduleName}-`)) modules.add(retired);
        if (
            entry.kind !== 'file' ||
            !entry.relativePath.endsWith('/project.json')
        )
            continue;
        let document;
        try {
            document = JSON.parse(readEntry(entry));
        } catch {
            continue;
        }
        for (const tag of Array.isArray(document.tags) ? document.tags : []) {
            const candidate = /^scope:([a-z][a-z0-9-]*)$/.exec(tag)?.[1];
            if (candidate?.startsWith(`${moduleName}-`)) modules.add(candidate);
        }
    }
    return [...modules].sort().flatMap(buildPatterns);
}

function validateProofEntries(entries, currentTombstonePath) {
    const prefix = 'docs/architecture/removed-modules/';
    const proofs = new Set();
    for (const entry of entries) {
        if (!entry.relativePath.startsWith(prefix)) continue;
        if (entry.relativePath === `${prefix}.tombstone-update.lock`) continue;
        if (
            entry.relativePath === currentTombstonePath &&
            entry.kind !== 'file'
        ) {
            proofs.add(entry.relativePath);
            continue;
        }
        const match =
            /^docs\/architecture\/removed-modules\/([a-z][a-z0-9-]*)\.json$/.exec(
                entry.relativePath
            );
        if (!match || entry.kind !== 'file')
            fail(`Entrée de preuve non canonique : ${entry.relativePath}.`);
        let document;
        try {
            document = JSON.parse(readEntry(entry));
        } catch (error) {
            fail(
                `Tombstone illisible ${entry.relativePath} : ${error.message}`
            );
        }
        validateTombstone(document, match[1], entry.relativePath);
        proofs.add(entry.relativePath);
    }
    return proofs;
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

function classifyRetainedSourceDefinition(
    options,
    inventoryEntries,
    occurrences,
    classifications
) {
    if (!options.retainSourceDefinition) return;
    const owners = [];
    for (const entry of inventoryEntries) {
        if (
            entry.kind !== 'file' ||
            !/^tools\/generator-platform\/sources\/[a-z0-9-]+\.definition\.json$/.test(
                entry.relativePath
            )
        )
            continue;
        let document;
        try {
            document = JSON.parse(readEntry(entry));
        } catch (error) {
            fail(
                `Définition source illisible ${entry.relativePath} : ${error.message}`
            );
        }
        if (document?.feature?.id === options.module) owners.push(entry);
    }
    if (owners.length === 0) return;
    if (owners.length > 1)
        fail(
            `Au plus une définition source canonique avec feature.id="${options.module}" ` +
                `est requise ; ${owners.length} trouvée(s).`
        );
    const definitionSuffix = owners[0].relativePath.slice(
        owners[0].relativePath.indexOf('sources/')
    );
    const entriesByPath = new Map(
        inventoryEntries.map((entry) => [entry.relativePath, entry])
    );
    for (const occurrence of occurrences) {
        const key = occurrenceKey(occurrence);
        if (
            occurrence.file === owners[0].relativePath &&
            !classifications.has(key)
        )
            classifications.set(key, {
                category: 'historical',
                reason: 'définition source canonique conservée comme preuve de conception',
            });
        else if (
            occurrence.file.endsWith('.test.mjs') &&
            occurrence.lineHint !== null &&
            readEntry(entriesByPath.get(occurrence.file))
                .split('\n')
                [occurrence.lineHint - 1]?.includes(definitionSuffix) &&
            !classifications.has(key)
        )
            classifications.set(key, {
                category: 'active',
                reason: 'test actif consommant directement la définition source conservée',
            });
    }
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

function writeTombstone(path, tombstone, expectedSha256 = null) {
    try {
        publishTombstone({
            root: ROOT,
            relativePath: path,
            tombstone,
            expectedSha256,
        });
    } catch (error) {
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
            options.updateTombstone ||
            expectedTombstonePath(options.module)
    );
    const proofEntries = validateProofEntries(inventory.entries, tombstonePath);
    const shadowPatterns = discoverLongerModulePatterns(
        inventory.entries,
        options.module
    );
    if (
        (options.tombstone ||
            options.createTombstone ||
            options.updateTombstone) &&
        tombstonePath !== expectedTombstonePath(options.module)
    )
        fail(
            `Emplacement canonique requis : ${expectedTombstonePath(options.module)}.`
        );
    if (options.tombstone || options.updateTombstone) {
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
        if (proofEntries.has(entry.relativePath)) continue;
        scannedEntries += 1;
        const content = readEntry(entry);
        occurrences.push(
            ...collectOccurrences(entry, patterns, shadowPatterns, content)
        );
    }

    if (options.createTombstone || options.updateTombstone)
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

    let tombstone;
    if (options.createTombstone) {
        const classifications = parseReferenceSpecifications(
            options,
            occurrences
        );
        classifyRetainedSourceDefinition(
            options,
            inventory.entries,
            occurrences,
            classifications
        );
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
    } else if (options.updateTombstone) {
        const previousHash = sha256(readFileSync(resolve(ROOT, tombstonePath)));
        const previous = readTombstone(tombstonePath, options.module);
        const explicit = parseReferenceSpecifications(options, occurrences);
        let update;
        try {
            update = buildUpdatedTombstone({
                previous,
                occurrences,
                explicit,
                occurrenceKey,
            });
        } catch (error) {
            fail(error.message);
        }
        const { missing } = update;
        if (missing.length > 0) {
            for (const occurrence of missing)
                console.error(
                    `  NON CLASSIFIÉE ${renderOccurrence(occurrence)}`
                );
            fail(
                `Actualisation refusée : ${missing.length} occurrence(s) nouvelle(s) exigent une classification exacte.`
            );
        }
        tombstone = update.tombstone;
        validateTombstone(tombstone, options.module, tombstonePath);
        writeTombstone(tombstonePath, tombstone, previousHash);
        console.log(
            `Tombstone actualisé : ${tombstone.references.length} occurrences exactes.`
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
                `${proofEntries.size} tombstone(s) canonique(s) validé(s) hors corpus lexical, ` +
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
            `${proofEntries.size} tombstone(s) canonique(s) validé(s) hors corpus lexical.`
    );
    console.error(
        `\nNettoie les occurrences non approuvées. Si une occurrence doit survivre, ` +
            `recrée explicitement le tombstone canonique après revue : aucune exemption de fichier entier n'est admise.\n`
    );
    process.exit(1);
}

main();
