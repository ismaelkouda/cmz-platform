import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { resolve } from 'node:path';

import { gitCommitInventory } from './git-object-reader.mjs';

function fail(message) {
    throw new Error(`page realization: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

export function gitInventory(root, excludedPaths) {
    const excluded = new Set(excludedPaths);
    let output;
    let deleted;
    try {
        output = execFileSync(
            'git',
            ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
            { cwd: root, encoding: 'utf8' }
        );
        deleted = new Set(
            execFileSync('git', ['ls-files', '-z', '--deleted'], {
                cwd: root,
                encoding: 'utf8',
            })
                .split('\0')
                .filter(Boolean)
        );
    } catch (error) {
        const detail = String(error.stderr ?? error.message ?? '').trim();
        fail(
            `Git inventory is required to bound LLM writes${detail ? ` (${detail})` : ''}`
        );
    }
    return output
        .split('\0')
        .filter((path) => path && !deleted.has(path) && !excluded.has(path))
        .sort()
        .map((path) => {
            const absolute = resolve(root, path);
            const metadata = lstatSync(absolute);
            let content;
            let kind;
            if (metadata.isSymbolicLink()) {
                // Le texte de la cible est l'identité Git du lien. Le lire via
                // readlink ne suit jamais la cible, y compris hors workspace.
                content = readlinkSync(absolute, { encoding: 'buffer' });
                kind = 'symlink';
            } else if (metadata.isFile()) {
                content = readFileSync(absolute);
                kind = 'file';
            } else {
                fail(`Git-visible entry has unsupported type: ${path}`);
            }
            return {
                path,
                kind,
                mode: metadata.mode & 0o777,
                bytes: content.byteLength,
                sha256: sha256(content),
            };
        });
}

export function baselineHash(entries) {
    return sha256(
        entries
            .map(
                (entry) =>
                    `${entry.path}\0${entry.kind}\0${entry.mode}\0${entry.bytes}\0${entry.sha256}`
            )
            .join('\0')
    );
}

export function v5Baseline(root, baseCommitSha, excludedPaths) {
    return gitCommitInventory(root, baseCommitSha, excludedPaths).map(
        ({ content, ...entry }) => ({
            ...entry,
            bytes: content.byteLength,
            sha256: sha256(content),
        })
    );
}
