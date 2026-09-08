import { execFileSync } from 'node:child_process';
import {
    closeSync,
    constants,
    fsyncSync,
    lstatSync,
    openSync,
    readFileSync,
    realpathSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';

import { validateRecipes } from '../check-library-setup.mjs';
import {
    executeCandidateLibraryForPromotion,
    loadLibraryConfiguration,
} from './add-library-core.mjs';
import { validateCompatibilityMatrices } from './compatibility.mjs';
import { buildVerificationFromExecution } from './compatibility-promotion.mjs';

function fail(message) {
    throw new Error(`promote-library-compatibility: ${message}`);
}

function processStart(pid) {
    try {
        return execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return '';
    }
}

function syncDirectory(path) {
    const descriptor = openSync(path, constants.O_RDONLY);
    try {
        fsyncSync(descriptor);
    } finally {
        closeSync(descriptor);
    }
}

function promotionLockPath(repository) {
    const dotGit = resolve(repository, '.git');
    const stats = lstatSync(dotGit);
    if (
        stats.isSymbolicLink() ||
        !stats.isDirectory() ||
        realpathSync(dotGit) !== dotGit
    ) {
        fail('.git doit être un vrai répertoire canonique en V1');
    }
    return join(dotGit, 'cmz-library-promotion.lock');
}

function lockDocument(processProbe) {
    const startedAt = processProbe(process.pid);
    if (!startedAt) fail('instant de démarrage du processus introuvable');
    return {
        schema_version: '1.0.0',
        pid: process.pid,
        started_at: startedAt,
        hostname: hostname(),
        uid: typeof process.getuid === 'function' ? process.getuid() : null,
    };
}

function readLock(path) {
    const stats = lstatSync(path);
    if (
        stats.isSymbolicLink() ||
        !stats.isFile() ||
        (stats.mode & 0o777) !== 0o600 ||
        (typeof process.getuid === 'function' && stats.uid !== process.getuid())
    ) {
        fail('verrou de promotion non régulier');
    }
    const value = JSON.parse(readFileSync(path, 'utf8'));
    const keys = ['hostname', 'pid', 'schema_version', 'started_at', 'uid'];
    if (
        !value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        Object.keys(value).sort().join('\0') !== keys.sort().join('\0') ||
        value.schema_version !== '1.0.0' ||
        !Number.isInteger(value.pid) ||
        value.pid <= 0 ||
        typeof value.started_at !== 'string' ||
        !value.started_at ||
        typeof value.hostname !== 'string' ||
        !value.hostname ||
        value.uid !==
            (typeof process.getuid === 'function' ? process.getuid() : null)
    ) {
        fail('verrou de promotion invalide');
    }
    return value;
}

export function acquirePromotionLock(
    repository,
    { processProbe = processStart } = {}
) {
    const path = promotionLockPath(repository);
    const document = lockDocument(processProbe);
    for (let attempt = 0; attempt < 2; attempt += 1) {
        let descriptor;
        try {
            descriptor = openSync(
                path,
                constants.O_CREAT |
                    constants.O_EXCL |
                    constants.O_WRONLY |
                    (constants.O_NOFOLLOW ?? 0),
                0o600
            );
            writeFileSync(descriptor, `${JSON.stringify(document)}\n`);
            fsyncSync(descriptor);
            closeSync(descriptor);
            descriptor = undefined;
            syncDirectory(dirname(path));
            return { path, document };
        } catch (error) {
            if (descriptor !== undefined) closeSync(descriptor);
            if (error.code !== 'EEXIST') throw error;
            let owner;
            try {
                owner = readLock(path);
            } catch (readError) {
                if (readError.code === 'ENOENT') continue;
                throw readError;
            }
            if (
                owner.hostname !== hostname() ||
                processProbe(owner.pid) === owner.started_at
            ) {
                fail(`promotion déjà active (pid ${owner.pid})`);
            }
            unlinkSync(path);
            syncDirectory(dirname(path));
        }
    }
    fail('impossible d’acquérir le verrou de promotion');
}

export function releasePromotionLock(lock) {
    const observed = readLock(lock.path);
    if (JSON.stringify(observed) !== JSON.stringify(lock.document)) {
        fail('le verrou de promotion a changé de propriétaire');
    }
    unlinkSync(lock.path);
    syncDirectory(dirname(lock.path));
}

function matrixPath(root, platform, library) {
    return join(
        root,
        'conventions',
        'libraries',
        platform,
        `${library}.compat.json`
    );
}

function atomicReplace(path, bytes) {
    const temporary = join(
        dirname(path),
        `.${path.split('/').at(-1)}.${randomUUID()}.tmp`
    );
    let descriptor;
    let cleanupError;
    try {
        descriptor = openSync(temporary, 'wx', 0o600);
        writeFileSync(descriptor, bytes);
        fsyncSync(descriptor);
        closeSync(descriptor);
        descriptor = undefined;
        renameSync(temporary, path);
    } finally {
        if (descriptor !== undefined) {
            try {
                closeSync(descriptor);
            } catch (error) {
                cleanupError = error;
            }
        }
        try {
            unlinkSync(temporary);
        } catch (error) {
            if (error.code !== 'ENOENT') cleanupError ??= error;
        }
    }
    if (cleanupError) throw cleanupError;
}

function statusPaths(root) {
    const output = execFileSync(
        'git',
        [
            '-C',
            root,
            '--no-replace-objects',
            '--no-lazy-fetch',
            'status',
            '--porcelain=v1',
            '--untracked-files=all',
        ],
        {
            encoding: 'utf8',
            env: {
                PATH: process.env.PATH,
                LANG: 'C',
                LC_ALL: 'C',
                GIT_CONFIG_NOSYSTEM: '1',
                GIT_CONFIG_GLOBAL: '/dev/null',
                GIT_CONFIG_SYSTEM: '/dev/null',
                GIT_OPTIONAL_LOCKS: '0',
                GIT_TERMINAL_PROMPT: '0',
            },
        }
    );
    const records = output.endsWith('\n') ? output.slice(0, -1) : output;
    return records
        ? records
              .split('\n')
              .map((line) => line.slice(3))
              .sort()
        : [];
}

export async function promoteCompatibilityTrack({
    repository,
    app,
    library,
    onProgress = () => undefined,
    execute = executeCandidateLibraryForPromotion,
    processProbe = processStart,
}) {
    const root = resolve(repository);
    const lock = acquirePromotionLock(root, { processProbe });
    let primaryError;
    let releaseError;
    let result;
    try {
        const configuration = loadLibraryConfiguration(root, app, library, {
            requiredTrackStatus: 'candidate',
        });
        const path = matrixPath(root, configuration.platform, library);
        const stats = lstatSync(path);
        if (stats.isSymbolicLink() || !stats.isFile()) {
            fail('la matrice cible n’est pas un fichier régulier');
        }
        const original = readFileSync(path);
        const execution = await execute({
            repository: root,
            app,
            library,
            onProgress,
        });
        const verification = buildVerificationFromExecution({
            root,
            recipe: configuration.recipe,
            recipeRegistry: validateRecipes(root).recipes,
            track: configuration.track,
            app,
            execution,
        });
        if (!readFileSync(path).equals(original)) {
            fail('la matrice candidate a changé pendant la qualification');
        }
        const matrix = JSON.parse(original.toString('utf8'));
        const matching = matrix.tracks.filter(
            (track) => track.id === configuration.track.id
        );
        if (matching.length !== 1 || matching[0].status !== 'candidate') {
            fail('la piste candidate ciblée a dérivé pendant la qualification');
        }
        matching[0].status = 'verified';
        matching[0].verification = verification;
        try {
            atomicReplace(path, `${JSON.stringify(matrix, null, 2)}\n`);
            const recipes = validateRecipes(root);
            if (!recipes.ok) fail(recipes.errors.join(' ; '));
            const compatibility = validateCompatibilityMatrices(
                root,
                recipes.recipes
            );
            if (!compatibility.ok) fail(compatibility.errors.join(' ; '));
            const changed = statusPaths(root);
            const expected = [
                `conventions/libraries/${configuration.platform}/${library}.compat.json`,
            ];
            if (JSON.stringify(changed) !== JSON.stringify(expected)) {
                fail(
                    `périmètre de mutation inattendu : ${changed.join(', ') || '(vide)'}`
                );
            }
            result = {
                library,
                platform: configuration.platform,
                verification,
            };
        } catch (error) {
            atomicReplace(path, original);
            throw error;
        }
    } catch (error) {
        primaryError = error;
    } finally {
        try {
            releasePromotionLock(lock);
        } catch (error) {
            releaseError = error;
        }
    }
    if (primaryError) {
        if (releaseError) primaryError.releaseError = releaseError;
        throw primaryError;
    }
    if (releaseError) throw releaseError;
    return result;
}
