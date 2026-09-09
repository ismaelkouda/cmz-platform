import { createHash } from 'node:crypto';
import {
    lstatSync,
    readFileSync,
    readdirSync,
    readlinkSync,
    realpathSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

import { validateSymlinkTarget, validateTreeEntries } from './git-tree.mjs';

const utf8 = new TextDecoder('utf-8', { fatal: true });

function fail(message) {
    throw new Error(`library filesystem snapshot: ${message}`);
}

function decodeName(name) {
    try {
        return utf8.decode(name);
    } catch {
        fail('nom de fichier non UTF-8');
    }
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

/**
 * `excludedDirectories` nomme des répertoires d'installation exclus **à toute
 * profondeur**, pas seulement à la racine. Bun, en workspace, matérialise un
 * `node_modules/` dans CHAQUE paquet (`libs/<domaine>/<couche>/node_modules/…`) :
 * une exclusion limitée au premier niveau laissait 498 liens d'installation
 * compter comme des mutations gouvernées, et `bun install --frozen-lockfile`
 * échouait dès le temps 1 (reproduit sur ce dépôt, 498 changements signalés,
 * 498 sous un `node_modules` imbriqué, zéro ailleurs).
 *
 * L'exclusion est sûre parce qu'aucun chemin `node_modules` n'existe dans
 * l'arbre Git (`git ls-tree -r HEAD` → 0) et que `.gitignore` l'exclut : rien
 * de gouverné ne peut s'y cacher, et un fichier invisible du change-set n'est
 * jamais publié. Chaque occurrence doit être un **vrai répertoire** — un
 * fichier ou un lien portant ce nom est refusé plutôt que sauté en silence.
 */
export function snapshotFilesystem(
    rootPath,
    { excludedDirectories = [] } = {}
) {
    const root = resolve(rootPath);
    const rootStats = lstatSync(root);
    if (
        rootStats.isSymbolicLink() ||
        !rootStats.isDirectory() ||
        realpathSync(root) !== root
    ) {
        fail('racine non canonique ou non répertoire');
    }
    const excluded = new Set(excludedDirectories);
    const leaves = [];
    function visit(directory, prefix = '') {
        const entries = readdirSync(directory, {
            encoding: 'buffer',
            withFileTypes: true,
        });
        for (const entry of entries) {
            const name = decodeName(entry.name);
            const path = prefix ? `${prefix}/${name}` : name;
            const absolute = join(directory, name);
            const stats = lstatSync(absolute);
            if (excluded.has(name)) {
                if (stats.isSymbolicLink() || !stats.isDirectory()) {
                    fail(`exclusion ${path} n'est pas un vrai répertoire`);
                }
                continue;
            }
            if (stats.isDirectory() && !stats.isSymbolicLink()) {
                visit(absolute, path);
                continue;
            }
            if (!stats.isFile() && !stats.isSymbolicLink()) {
                fail(`fichier spécial interdit : ${path}`);
            }
            const content = stats.isSymbolicLink()
                ? readlinkSync(absolute, { encoding: 'buffer' })
                : readFileSync(absolute);
            const mode = stats.isSymbolicLink()
                ? '120000'
                : stats.mode & 0o111
                  ? '100755'
                  : '100644';
            if (stats.isSymbolicLink()) validateSymlinkTarget(path, content);
            leaves.push({
                path: Buffer.from(path),
                mode,
                type: 'blob',
                oid: sha256(content),
                content,
            });
        }
    }
    visit(root);
    return validateTreeEntries(leaves).map(({ path, mode, content }) => ({
        path,
        mode,
        bytes: content.length,
        sha256: sha256(content),
    }));
}

export function snapshotSha256(entries) {
    const hash = createHash('sha256');
    for (const entry of [...entries].sort((a, b) =>
        a.path.localeCompare(b.path)
    )) {
        hash.update(entry.path);
        hash.update('\0');
        hash.update(entry.mode);
        hash.update('\0');
        hash.update(entry.sha256);
        hash.update('\0');
        hash.update(String(entry.bytes));
        hash.update('\0');
    }
    return hash.digest('hex');
}
