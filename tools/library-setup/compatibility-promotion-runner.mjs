import { execFileSync } from 'node:child_process';
import {
    closeSync,
    fsyncSync,
    lstatSync,
    openSync,
    readFileSync,
    renameSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
}) {
    const root = resolve(repository);
    const configuration = loadLibraryConfiguration(root, app, library, {
        requiredTrackStatus: 'candidate',
    });
    const execution = await execute({
        repository: root,
        app,
        library,
        onProgress,
    });
    const verification = buildVerificationFromExecution({
        root,
        recipe: configuration.recipe,
        track: configuration.track,
        app,
        execution,
    });
    const path = matrixPath(root, configuration.platform, library);
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        fail('la matrice cible n’est pas un fichier régulier');
    }
    const original = readFileSync(path);
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
        return { library, platform: configuration.platform, verification };
    } catch (error) {
        atomicReplace(path, original);
        throw error;
    }
}
