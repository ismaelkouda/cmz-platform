import { createHash, randomUUID } from 'node:crypto';
import {
    closeSync,
    fsyncSync,
    linkSync,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { hostname } from 'node:os';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

function exists(path) {
    try {
        lstatSync(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

function hash(content) {
    return createHash('sha256').update(content).digest('hex');
}

function acquireLock(path) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const fd = openSync(path, 'wx', 0o600);
            writeFileSync(
                fd,
                `${JSON.stringify({ pid: process.pid, hostname: hostname() })}\n`
            );
            fsyncSync(fd);
            closeSync(fd);
            return;
        } catch (error) {
            if (error.code !== 'EEXIST') throw error;
        }
        const metadata = lstatSync(path);
        if (!metadata.isFile() || metadata.isSymbolicLink())
            throw new Error(`Verrou de tombstone non régulier : ${path}.`);
        const owner = JSON.parse(readFileSync(path, 'utf8'));
        if (
            owner?.hostname !== hostname() ||
            !Number.isInteger(owner?.pid) ||
            owner.pid <= 0
        )
            throw new Error(`Verrou de tombstone invalide : ${path}.`);
        try {
            process.kill(owner.pid, 0);
            throw new Error(`Actualisation de tombstone déjà en cours.`);
        } catch (error) {
            if (error.code !== 'ESRCH') throw error;
        }
        rmSync(path);
    }
    throw new Error(`Verrou de tombstone impossible à acquérir.`);
}

export function publishTombstone({
    root,
    relativePath,
    tombstone,
    expectedSha256 = null,
}) {
    const absoluteRoot = resolve(root);
    const absolutePath = resolve(absoluteRoot, relativePath);
    const normalizedRelativePath = relative(absoluteRoot, absolutePath);
    if (
        !normalizedRelativePath ||
        isAbsolute(normalizedRelativePath) ||
        normalizedRelativePath === '..' ||
        normalizedRelativePath.startsWith(`..${sep}`)
    )
        throw new Error(
            `Chemin de tombstone hors workspace : ${relativePath}.`
        );
    const parentPath = dirname(absolutePath);
    let cursor = absoluteRoot;
    for (const component of relative(absoluteRoot, parentPath)
        .split(sep)
        .filter(Boolean)) {
        cursor = resolve(cursor, component);
        if (!exists(cursor)) mkdirSync(cursor, { mode: 0o755 });
        const metadata = lstatSync(cursor);
        if (!metadata.isDirectory() || metadata.isSymbolicLink())
            throw new Error(
                `Parent de tombstone non régulier refusé : ${relative(root, cursor)}.`
            );
    }
    if (expectedSha256 === null && exists(absolutePath))
        throw new Error(
            `Refus d'écraser le tombstone existant : ${relativePath}.`
        );
    const lockPath = resolve(parentPath, '.tombstone-update.lock');
    const temporary = `${absolutePath}.tmp-${process.pid}-${randomUUID()}`;
    let fd;
    let locked = false;
    try {
        if (expectedSha256 !== null) {
            acquireLock(lockPath);
            locked = true;
            if (hash(readFileSync(absolutePath)) !== expectedSha256)
                throw new Error(
                    `Le tombstone ${relativePath} a dérivé avant son actualisation.`
                );
        }
        fd = openSync(temporary, 'wx', 0o600);
        writeFileSync(fd, `${JSON.stringify(tombstone, null, 2)}\n`);
        fsyncSync(fd);
        closeSync(fd);
        fd = undefined;
        if (expectedSha256 === null) {
            linkSync(temporary, absolutePath);
            rmSync(temporary);
        } else {
            if (hash(readFileSync(absolutePath)) !== expectedSha256)
                throw new Error(
                    `Le tombstone ${relativePath} a dérivé pendant son actualisation.`
                );
            renameSync(temporary, absolutePath);
        }
        const parent = openSync(parentPath, 'r');
        fsyncSync(parent);
        closeSync(parent);
    } finally {
        if (fd !== undefined) closeSync(fd);
        rmSync(temporary, { force: true });
        if (locked) rmSync(lockPath, { force: true });
    }
}

export function buildUpdatedTombstone({
    previous,
    occurrences,
    explicit,
    occurrenceKey,
}) {
    const retained = new Map(
        previous.references.map((reference) => [
            occurrenceKey(reference),
            { category: reference.category, reason: reference.reason },
        ])
    );
    for (const key of explicit.keys())
        if (retained.has(key))
            throw new Error(
                'Une occurrence inchangée ne doit pas être reclassifiée.'
            );
    const missing = occurrences.filter(
        (occurrence) =>
            !retained.has(occurrenceKey(occurrence)) &&
            !explicit.has(occurrenceKey(occurrence))
    );
    if (missing.length > 0) return { missing, tombstone: null };
    return {
        missing,
        tombstone: {
            ...previous,
            references: occurrences
                .map((occurrence) => ({
                    ...occurrence,
                    ...(retained.get(occurrenceKey(occurrence)) ||
                        explicit.get(occurrenceKey(occurrence))),
                }))
                .sort((a, b) =>
                    occurrenceKey(a).localeCompare(occurrenceKey(b))
                ),
        },
    };
}
