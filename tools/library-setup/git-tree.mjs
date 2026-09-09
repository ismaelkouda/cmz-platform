import { createHash } from 'node:crypto';
import {
    constants,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    readlinkSync,
    readdirSync,
    closeSync,
    chmodSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path';

const ALLOWED_MODES = new Set(['100644', '100755', '120000']);
const utf8 = new TextDecoder('utf-8', { fatal: true });

function fail(message) {
    throw new Error(`library candidate tree: ${message}`);
}

function git(repository, args, options = {}) {
    const env = {
        PATH: process.env.PATH,
        LANG: 'C',
        LC_ALL: 'C',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_SYSTEM: '/dev/null',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_TERMINAL_PROMPT: '0',
    };
    try {
        return execFileSync(
            'git',
            [
                '-C',
                resolve(repository),
                '--no-replace-objects',
                '--no-lazy-fetch',
                ...args,
            ],
            {
                encoding: options.encoding ?? 'buffer',
                input: options.input,
                env,
                maxBuffer: 256 * 1024 * 1024,
                stdio: ['pipe', 'pipe', 'pipe'],
            }
        );
    } catch (error) {
        const stderr = Buffer.isBuffer(error.stderr)
            ? error.stderr.toString('utf8').trim()
            : String(error.stderr ?? '').trim();
        fail(`git ${args[0]} a échoué${stderr ? ` (${stderr})` : ''}`);
    }
}

function decodePath(pathBytes) {
    let path;
    try {
        path = utf8.decode(pathBytes);
    } catch {
        fail('chemin Git non UTF-8');
    }
    if (
        path.length === 0 ||
        isAbsolute(path) ||
        path.includes('\\') ||
        path
            .split('/')
            .some(
                (segment) =>
                    segment === '' || segment === '.' || segment === '..'
            )
    ) {
        fail(`chemin Git non canonique : ${JSON.stringify(path)}`);
    }
    for (const segment of path.split('/')) {
        if (segment.normalize('NFKC').toLowerCase() === '.git') {
            fail(`segment .git interdit : ${path}`);
        }
    }
    return path;
}

export function validateSymlinkTarget(path, content) {
    let target;
    try {
        target = utf8.decode(content);
    } catch {
        fail(`cible de lien non UTF-8 : ${path}`);
    }
    if (target.length === 0 || target.includes('\0') || isAbsolute(target)) {
        fail(`cible de lien absolue ou vide : ${path}`);
    }
    const stack =
        posix.dirname(path) === '.' ? [] : posix.dirname(path).split('/');
    for (const segment of target.split('/')) {
        if (segment === '' || segment === '.') continue;
        if (segment === '..') {
            if (stack.length === 0) fail(`lien hors candidat : ${path}`);
            stack.pop();
        } else {
            stack.push(segment);
        }
    }
    return target;
}

function expectedDirectories(entries) {
    const directories = new Set();
    for (const { path } of entries) {
        const segments = path.split('/');
        for (let index = 1; index < segments.length; index += 1) {
            directories.add(segments.slice(0, index).join('/'));
        }
    }
    return directories;
}

export function validateTreeEntries(rawEntries) {
    const normalized = [];
    const exact = new Set();
    const nfc = new Set();
    const folded = new Set();
    for (const raw of rawEntries) {
        if (!ALLOWED_MODES.has(raw.mode) || raw.type !== 'blob') {
            fail(`mode ou type Git interdit : ${raw.mode} ${raw.type}`);
        }
        const path = Buffer.isBuffer(raw.path)
            ? decodePath(raw.path)
            : decodePath(Buffer.from(raw.path, 'utf8'));
        const canonical = path.normalize('NFC');
        const caseFolded = canonical.toLocaleLowerCase('en-US');
        if (exact.has(path)) fail(`entrée Git dupliquée : ${path}`);
        if (nfc.has(canonical)) fail(`collision Unicode NFC : ${path}`);
        if (folded.has(caseFolded))
            fail(`collision insensible à la casse : ${path}`);
        exact.add(path);
        nfc.add(canonical);
        folded.add(caseFolded);
        normalized.push({ ...raw, path });
    }
    normalized.sort((left, right) =>
        Buffer.from(left.path).compare(Buffer.from(right.path))
    );
    for (let index = 0; index < normalized.length - 1; index += 1) {
        if (
            normalized[index + 1].path.startsWith(`${normalized[index].path}/`)
        ) {
            fail(`conflit fichier/répertoire : ${normalized[index].path}`);
        }
    }
    return normalized;
}

function parseLsTree(output) {
    const entries = [];
    let offset = 0;
    while (offset < output.length) {
        const end = output.indexOf(0, offset);
        if (end < 0) fail('sortie ls-tree non terminée par NUL');
        const record = output.subarray(offset, end);
        const tab = record.indexOf(9);
        if (tab < 0) fail('sortie ls-tree sans séparateur de chemin');
        const header = record.subarray(0, tab).toString('ascii').split(' ');
        if (header.length !== 3 || !/^[0-9a-f]+$/.test(header[2])) {
            fail('en-tête ls-tree invalide');
        }
        entries.push({
            mode: header[0],
            type: header[1],
            oid: header[2],
            path: record.subarray(tab + 1),
        });
        offset = end + 1;
    }
    return validateTreeEntries(entries);
}

function readBlobs(repository, entries) {
    const oids = [...new Set(entries.map(({ oid }) => oid))];
    const output = git(repository, ['cat-file', '--batch'], {
        input: Buffer.from(`${oids.join('\n')}\n`),
    });
    const contents = new Map();
    let offset = 0;
    for (const requested of oids) {
        const lineEnd = output.indexOf(10, offset);
        if (lineEnd < 0) fail('sortie cat-file tronquée');
        const header = output
            .subarray(offset, lineEnd)
            .toString('ascii')
            .split(' ');
        if (
            header.length !== 3 ||
            header[0] !== requested ||
            header[1] !== 'blob' ||
            !/^\d+$/.test(header[2])
        ) {
            fail(`réponse cat-file invalide pour ${requested}`);
        }
        const size = Number(header[2]);
        const start = lineEnd + 1;
        const end = start + size;
        if (end >= output.length || output[end] !== 10) {
            fail(`contenu cat-file tronqué pour ${requested}`);
        }
        contents.set(requested, Buffer.from(output.subarray(start, end)));
        offset = end + 1;
    }
    if (offset !== output.length)
        fail('données cat-file inattendues après le batch');
    return contents;
}

export function readGitTree(repository, commit = 'HEAD') {
    const resolvedCommit = git(
        repository,
        ['rev-parse', '--verify', `${commit}^{commit}`],
        {
            encoding: 'utf8',
        }
    ).trim();
    const objectFormat = git(
        repository,
        ['rev-parse', '--show-object-format'],
        {
            encoding: 'utf8',
        }
    ).trim();
    if (!['sha1', 'sha256'].includes(objectFormat)) {
        fail(`format d'objet Git non supporté : ${objectFormat}`);
    }
    const entries = parseLsTree(
        git(repository, ['ls-tree', '-r', '-z', '--full-tree', resolvedCommit])
    );
    const blobs = readBlobs(repository, entries);
    for (const entry of entries) {
        entry.content = blobs.get(entry.oid);
        if (!entry.content) fail(`blob absent du batch : ${entry.oid}`);
        if (entry.mode === '120000') {
            entry.linkTarget = validateSymlinkTarget(entry.path, entry.content);
        }
    }
    return {
        commit: resolvedCommit,
        objectFormat,
        entries,
        directories: [...expectedDirectories(entries)].sort(),
    };
}

function withinRoot(root, path) {
    const target = resolve(root, ...path.split('/'));
    const rel = relative(resolve(root), target);
    if (
        rel === '' ||
        rel === '..' ||
        rel.startsWith(`..${sep}`) ||
        isAbsolute(rel)
    ) {
        fail(`chemin hors candidat : ${path}`);
    }
    return target;
}

function assertRealDirectory(path, label) {
    const stats = lstatSync(path);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
        fail(`${label} n'est pas un vrai répertoire`);
    }
}

function writeRegularFile(path, content, mode) {
    const fd = openSync(
        path,
        constants.O_CREAT |
            constants.O_EXCL |
            constants.O_WRONLY |
            (constants.O_NOFOLLOW ?? 0),
        mode
    );
    try {
        writeFileSync(fd, content);
    } finally {
        closeSync(fd);
    }
    chmodSync(path, mode);
}

export function materializeGitTree(tree, destination) {
    const root = resolve(destination);
    assertRealDirectory(root, 'racine du candidat');
    if (readdirSync(root).length !== 0) fail('racine du candidat non vide');
    for (const directory of tree.directories.sort(
        (left, right) =>
            left.split('/').length - right.split('/').length ||
            left.localeCompare(right)
    )) {
        const target = withinRoot(root, directory);
        assertRealDirectory(dirname(target), `parent de ${directory}`);
        mkdirSync(target, { mode: 0o700 });
        chmodSync(target, 0o700);
    }
    for (const entry of tree.entries) {
        const target = withinRoot(root, entry.path);
        assertRealDirectory(dirname(target), `parent de ${entry.path}`);
        if (entry.mode === '120000') {
            symlinkSync(entry.linkTarget, target);
        } else {
            writeRegularFile(
                target,
                entry.content,
                entry.mode === '100755' ? 0o755 : 0o644
            );
        }
    }
    verifyMaterializedTree(tree, root);
    return root;
}

export function gitBlobOid(content, algorithm) {
    const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
    return createHash(algorithm)
        .update(Buffer.from(`blob ${bytes.length}\0`))
        .update(bytes)
        .digest('hex');
}

function inventoryDisk(root) {
    const leaves = new Map();
    const directories = new Set();
    function visit(directory, prefix = '') {
        for (const name of readdirSync(directory)) {
            const path = prefix ? `${prefix}/${name}` : name;
            const absolute = withinRoot(root, path);
            const stats = lstatSync(absolute);
            if (stats.isDirectory()) {
                directories.add(path);
                visit(absolute, path);
            } else if (stats.isFile() || stats.isSymbolicLink()) {
                leaves.set(path, { absolute, stats });
            } else {
                fail(`fichier spécial inattendu : ${path}`);
            }
        }
    }
    visit(root);
    return { leaves, directories };
}

export function verifyMaterializedTree(tree, destination) {
    const root = resolve(destination);
    assertRealDirectory(root, 'racine du candidat');
    const actual = inventoryDisk(root);
    const expectedDirs = new Set(tree.directories);
    if (
        JSON.stringify([...actual.directories].sort()) !==
        JSON.stringify([...expectedDirs].sort())
    ) {
        fail('inventaire des répertoires différent du tree');
    }
    const expectedPaths = tree.entries.map(({ path }) => path).sort();
    if (
        JSON.stringify([...actual.leaves.keys()].sort()) !==
        JSON.stringify(expectedPaths)
    ) {
        fail('inventaire des feuilles différent du tree');
    }
    for (const entry of tree.entries) {
        const observed = actual.leaves.get(entry.path);
        const isLink = observed.stats.isSymbolicLink();
        if (isLink !== (entry.mode === '120000')) {
            fail(`type différent du tree : ${entry.path}`);
        }
        const content = isLink
            ? readlinkSync(observed.absolute, { encoding: 'buffer' })
            : readFileSync(observed.absolute);
        const mode = isLink
            ? '120000'
            : observed.stats.mode & 0o111
              ? '100755'
              : '100644';
        if (mode !== entry.mode) fail(`mode différent du tree : ${entry.path}`);
        if (gitBlobOid(content, tree.objectFormat) !== entry.oid) {
            fail(`OID différent du tree : ${entry.path}`);
        }
        if (isLink) validateSymlinkTarget(entry.path, content);
    }
    return true;
}
