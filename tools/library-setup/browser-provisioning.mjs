import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    chmodSync,
    closeSync,
    constants,
    existsSync,
    fsyncSync,
    linkSync,
    lstatSync,
    mkdirSync,
    openSync,
    readFileSync,
    readdirSync,
    realpathSync,
    rmSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { arch, platform, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const utf8 = new TextDecoder('utf-8', { fatal: true });

function fail(message) {
    throw new Error(`library browser: ${message}`);
}

export function browserPlatformKey({
    backend,
    osPlatform = platform(),
    osArch = arch(),
} = {}) {
    if (backend === 'docker') return 'linux-x64';
    if (backend === 'macos' || backend === undefined) {
        if (osPlatform === 'darwin' && osArch === 'arm64')
            return 'darwin-arm64';
        if (osPlatform === 'linux' && osArch === 'x64') return 'linux-x64';
    }
    fail(
        `plateforme non couverte par la politique : ${backend ?? 'hôte'} ${osPlatform}/${osArch}`
    );
}

export function browserCacheRoot(requestedRoot) {
    const parent = requestedRoot
        ? realpathSync(dirname(requestedRoot))
        : realpathSync(tmpdir());
    const root = requestedRoot
        ? join(parent, basename(requestedRoot))
        : join(parent, 'cmz-library-browser-archives-v2');
    if (!existsSync(root)) {
        mkdirSync(root, { mode: 0o700 });
        chmodSync(root, 0o700);
    }
    const stats = lstatSync(root);
    if (
        stats.isSymbolicLink() ||
        !stats.isDirectory() ||
        realpathSync(root) !== root ||
        (stats.mode & 0o777) !== 0o700 ||
        (typeof process.getuid === 'function' && stats.uid !== process.getuid())
    ) {
        fail('cache navigateur non canonique ou mal protégé');
    }
    return root;
}

export function verifyArchive(bytes, expectedSha256) {
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== expectedSha256) {
        fail(
            `empreinte d'archive inattendue : ${digest} au lieu de ${expectedSha256}`
        );
    }
    return digest;
}

function archiveOf(policy, platformKey) {
    const browser = policy.browser;
    if (!browser) fail('politique sans section browser');
    const archive = browser.archives?.[platformKey];
    if (!archive) fail(`aucune archive épinglée pour ${platformKey}`);
    let url;
    let allowed;
    try {
        url = new URL(archive.url);
        allowed = new URL(browser.download_host);
    } catch {
        fail('URL de navigateur invalide');
    }
    if (
        url.protocol !== 'https:' ||
        url.origin !== allowed.origin ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
    ) {
        fail(`archive hors de l'hôte autorisé : ${archive.url}`);
    }
    if (!url.pathname.split('/').includes(browser.version)) {
        fail(`archive incohérente avec la version ${browser.version}`);
    }
    return archive;
}

export function browserExecutablePath(policy, extractionRoot, platformKey) {
    const archive = archiveOf(policy, platformKey);
    return join(extractionRoot, archive.executable);
}

function verifiedCachedArchive(root, archive, browserPolicy) {
    const path = join(root, `${archive.sha256}.zip`);
    if (!existsSync(path)) return null;
    const stats = lstatSync(path);
    if (
        stats.isSymbolicLink() ||
        !stats.isFile() ||
        (stats.mode & 0o777) !== 0o600
    ) {
        fail('archive navigateur en cache non régulière ou non privée');
    }
    const bytes = readFileSync(path);
    verifyArchive(bytes, archive.sha256);
    const paths = inspectZipArchive(bytes, {
        maxEntries: browserPolicy.max_archive_entries,
        maxExtractedBytes: browserPolicy.max_extracted_bytes,
    });
    return { path, bytes, paths };
}

function publishArchive(root, archive, bytes, browserPolicy) {
    const finalPath = join(root, `${archive.sha256}.zip`);
    const temporary = join(
        root,
        `.${archive.sha256}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
    );
    const fd = openSync(
        temporary,
        constants.O_CREAT |
            constants.O_EXCL |
            constants.O_WRONLY |
            (constants.O_NOFOLLOW ?? 0),
        0o600
    );
    try {
        writeFileSync(fd, bytes);
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
    try {
        linkSync(temporary, finalPath);
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        verifiedCachedArchive(root, archive, browserPolicy);
    } finally {
        unlinkSync(temporary);
    }
    return finalPath;
}

function freshExtractionRoot(requestedRoot) {
    if (typeof requestedRoot !== 'string' || requestedRoot.length === 0) {
        fail('racine d’extraction éphémère obligatoire');
    }
    const parent = realpathSync(dirname(requestedRoot));
    const root = join(parent, basename(requestedRoot));
    if (
        basename(requestedRoot) === '.' ||
        basename(requestedRoot) === '..' ||
        resolve(parent, basename(requestedRoot)) !== root ||
        existsSync(root)
    ) {
        fail('racine d’extraction non canonique ou déjà existante');
    }
    mkdirSync(root, { mode: 0o700 });
    chmodSync(root, 0o700);
    return root;
}

export async function provisionBrowser({
    policy,
    cacheRoot,
    extractionRoot,
    backend,
    platformKey = browserPlatformKey({ backend }),
    download = downloadExactUrl,
    unzip = defaultUnzip,
}) {
    const cache = browserCacheRoot(cacheRoot);
    const archive = archiveOf(policy, platformKey);
    let cached = verifiedCachedArchive(cache, archive, policy.browser);
    let downloaded = false;
    if (!cached) {
        const bytes = await download(archive.url, {
            allowedOrigin: policy.browser.download_host,
            maxBytes: policy.browser.max_archive_bytes,
            timeoutMs: policy.browser.download_timeout_ms,
        });
        verifyArchive(bytes, archive.sha256);
        const paths = inspectZipArchive(bytes, {
            maxEntries: policy.browser.max_archive_entries,
            maxExtractedBytes: policy.browser.max_extracted_bytes,
        });
        const path = publishArchive(cache, archive, bytes, policy.browser);
        cached = { path, bytes, paths };
        downloaded = true;
    }

    const root = freshExtractionRoot(extractionRoot);
    const privateArchive = join(root, '.browser-archive.zip');
    try {
        writeFileSync(privateArchive, cached.bytes, {
            flag: 'wx',
            mode: 0o600,
        });
        unzip(privateArchive, root);
        unlinkSync(privateArchive);
        const executable = browserExecutablePath(policy, root, platformKey);
        if (!existsSync(executable)) {
            fail(`archive sans binaire attendu : ${archive.executable}`);
        }
        const stats = lstatSync(executable);
        if (stats.isSymbolicLink() || !stats.isFile()) {
            fail('binaire navigateur extrait non régulier');
        }
        chmodSync(executable, 0o700);
        validateExtractedTree(root, cached.paths);
        return { executable, root, downloaded };
    } catch (error) {
        rmSync(root, { recursive: true, force: true });
        throw error;
    }
}

export async function downloadExactUrl(
    url,
    { allowedOrigin, maxBytes, timeoutMs, fetchImpl = fetch }
) {
    let requested;
    let allowed;
    try {
        requested = new URL(url);
        allowed = new URL(allowedOrigin);
    } catch {
        fail('URL de téléchargement ou origine autorisée invalide');
    }
    if (
        requested.protocol !== 'https:' ||
        requested.origin !== allowed.origin ||
        requested.username ||
        requested.password
    ) {
        fail(`URL de téléchargement hors origine autorisée : ${url}`);
    }
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
        fail('limite de taille de téléchargement invalide');
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
        fail('délai de téléchargement invalide');
    }
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);
    try {
        const response = await fetchImpl(url, {
            redirect: 'error',
            signal: controller.signal,
        });
        if (!response.ok) {
            fail(`téléchargement refusé (${response.status}) : ${url}`);
        }
        if (new URL(response.url).origin !== allowed.origin) {
            fail(`réponse redirigée hors de l'hôte autorisé : ${response.url}`);
        }
        const lengthHeader = response.headers.get('content-length');
        if (lengthHeader !== null) {
            const length = Number(lengthHeader);
            if (!Number.isSafeInteger(length) || length < 0) {
                fail(`Content-Length invalide : ${lengthHeader}`);
            }
            if (length > maxBytes) {
                fail(`archive annoncée trop grande : ${length} octets`);
            }
        }
        if (!response.body) fail('réponse de téléchargement sans corps');
        const chunks = [];
        let total = 0;
        for await (const chunk of response.body) {
            const bytes = Buffer.from(chunk);
            total += bytes.length;
            if (total > maxBytes) {
                controller.abort();
                fail(`archive reçue trop grande : plus de ${maxBytes} octets`);
            }
            chunks.push(bytes);
        }
        return Buffer.concat(chunks, total);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message.startsWith('library browser:')
        ) {
            throw error;
        }
        if (timedOut) {
            fail(`téléchargement expiré après ${timeoutMs} ms`);
        }
        fail(
            `téléchargement impossible: ${error instanceof Error ? error.message : String(error)}`
        );
    } finally {
        clearTimeout(timeout);
    }
}

export function validateArchivePaths(paths) {
    const nodes = new Map();
    for (const original of paths) {
        if (typeof original !== 'string') {
            fail('nom de fichier non textuel dans l’archive');
        }
        const isDirectory = original.endsWith('/');
        const path = original.endsWith('/') ? original.slice(0, -1) : original;
        const segments = path.split('/');
        if (
            !path ||
            path !== path.normalize('NFC') ||
            path.startsWith('/') ||
            path.includes('\\') ||
            containsControlCharacter(path) ||
            segments.some(
                (segment) =>
                    segment === '' || segment === '.' || segment === '..'
            )
        ) {
            fail(`chemin d'archive non sûr : ${JSON.stringify(original)}`);
        }
        for (let index = 1; index <= segments.length; index += 1) {
            const candidate = segments.slice(0, index).join('/');
            const key = candidate.normalize('NFC').toLocaleLowerCase('en-US');
            const leaf = index === segments.length;
            const type = leaf && !isDirectory ? 'file' : 'directory';
            const existing = nodes.get(key);
            if (existing) {
                if (existing.path !== candidate) {
                    fail(
                        `chemin d'archive dupliqué par casse ou normalisation : ${JSON.stringify(original)}`
                    );
                }
                if (existing.type === 'file' || (leaf && type === 'file')) {
                    fail(
                        `fichier ancêtre ou chemin dupliqué dans l'archive : ${JSON.stringify(original)}`
                    );
                }
                if (leaf && existing.explicit) {
                    fail(
                        `chemin d'archive dupliqué : ${JSON.stringify(original)}`
                    );
                }
                if (leaf) existing.explicit = true;
                continue;
            }
            nodes.set(key, {
                path: candidate,
                type,
                explicit: leaf,
            });
        }
    }
    if (nodes.size === 0) fail('archive vide');
}

function expectedExtractedEntries(paths) {
    const expected = new Set();
    for (const original of paths) {
        const directory = original.endsWith('/');
        const path = directory ? original.slice(0, -1) : original;
        const segments = path.split('/');
        const directoryDepth = directory
            ? segments.length
            : segments.length - 1;
        for (let index = 1; index <= directoryDepth; index += 1) {
            expected.add(`${segments.slice(0, index).join('/')}/`);
        }
        if (!directory) expected.add(path);
    }
    return [...expected].sort();
}

function validateExtractedTree(root, archivePaths) {
    const actual = [];
    function visit(directory, prefix = '') {
        for (const nameBytes of readdirSync(directory, {
            encoding: 'buffer',
        })) {
            const name = decodeZipName(nameBytes);
            const path = prefix ? `${prefix}/${name}` : name;
            const absolute = join(directory, name);
            const stats = lstatSync(absolute);
            if (stats.isSymbolicLink()) {
                fail(`lien symbolique dans le navigateur extrait : ${path}`);
            }
            if (stats.isDirectory()) {
                actual.push(`${path}/`);
                visit(absolute, path);
            } else if (stats.isFile()) {
                actual.push(path);
            } else {
                fail(`fichier spécial dans le navigateur extrait : ${path}`);
            }
        }
    }
    visit(root);
    actual.sort();
    const expected = expectedExtractedEntries(archivePaths);
    if (
        actual.length !== expected.length ||
        actual.some((path, index) => path !== expected[index])
    ) {
        const difference =
            actual.find((path, index) => path !== expected[index]) ??
            expected[actual.length] ??
            'inconnue';
        fail(`arbre extrait différent du ZIP : ${JSON.stringify(difference)}`);
    }
}

function uint16(bytes, offset, label) {
    if (offset < 0 || offset + 2 > bytes.length) {
        fail(`ZIP tronqué (${label})`);
    }
    return bytes.readUInt16LE(offset);
}

function uint32(bytes, offset, label) {
    if (offset < 0 || offset + 4 > bytes.length) {
        fail(`ZIP tronqué (${label})`);
    }
    return bytes.readUInt32LE(offset);
}

function decodeZipName(bytes) {
    try {
        return utf8.decode(bytes);
    } catch {
        fail('nom de fichier non UTF-8 dans l’archive');
    }
}

function containsControlCharacter(value) {
    return [...value].some((character) => {
        const code = character.codePointAt(0);
        return code <= 31 || code === 127;
    });
}

export function inspectZipArchive(input, { maxEntries, maxExtractedBytes }) {
    const bytes = Buffer.from(input);
    if (!Number.isSafeInteger(maxEntries) || maxEntries <= 0) {
        fail("limite d'entrées ZIP invalide");
    }
    if (!Number.isSafeInteger(maxExtractedBytes) || maxExtractedBytes <= 0) {
        fail('limite de taille décompressée invalide');
    }

    const minimumEocd = 22;
    const earliest = Math.max(0, bytes.length - minimumEocd - 0xffff);
    let eocd = -1;
    for (
        let offset = bytes.length - minimumEocd;
        offset >= earliest;
        offset -= 1
    ) {
        if (
            bytes.readUInt32LE(offset) === 0x06054b50 &&
            offset + minimumEocd + uint16(bytes, offset + 20, 'commentaire') ===
                bytes.length
        ) {
            eocd = offset;
            break;
        }
    }
    if (eocd < 0) fail('répertoire central ZIP absent ou ambigu');

    const disk = uint16(bytes, eocd + 4, 'disque');
    const centralDisk = uint16(bytes, eocd + 6, 'disque central');
    const diskEntries = uint16(bytes, eocd + 8, 'entrées disque');
    const totalEntries = uint16(bytes, eocd + 10, 'entrées totales');
    const centralSize = uint32(bytes, eocd + 12, 'taille centrale');
    const centralOffset = uint32(bytes, eocd + 16, 'offset central');
    if (
        disk !== 0 ||
        centralDisk !== 0 ||
        diskEntries !== totalEntries ||
        totalEntries === 0xffff ||
        centralSize === 0xffffffff ||
        centralOffset === 0xffffffff
    ) {
        fail('ZIP multi-disque ou ZIP64 non admis');
    }
    if (totalEntries === 0 || totalEntries > maxEntries) {
        fail(`nombre d'entrées ZIP hors limite : ${totalEntries}`);
    }
    if (centralOffset + centralSize !== eocd) {
        fail('bornes du répertoire central ZIP incohérentes');
    }

    const paths = [];
    const localRanges = [];
    let totalExtracted = 0;
    let cursor = centralOffset;
    for (let index = 0; index < totalEntries; index += 1) {
        if (uint32(bytes, cursor, 'entrée centrale') !== 0x02014b50) {
            fail(`signature centrale ZIP invalide à l'entrée ${index}`);
        }
        const madeByHost = uint16(bytes, cursor + 4, 'version créateur') >>> 8;
        const flags = uint16(bytes, cursor + 8, 'drapeaux centraux');
        const method = uint16(bytes, cursor + 10, 'méthode de compression');
        const crc32 = uint32(bytes, cursor + 16, 'CRC central');
        const compressedSize = uint32(bytes, cursor + 20, 'taille compressée');
        const extractedSize = uint32(bytes, cursor + 24, 'taille extraite');
        const nameLength = uint16(bytes, cursor + 28, 'longueur du nom');
        const extraLength = uint16(bytes, cursor + 30, 'longueur extra');
        const commentLength = uint16(
            bytes,
            cursor + 32,
            'longueur commentaire'
        );
        const startDisk = uint16(bytes, cursor + 34, 'disque de départ');
        const externalAttributes = uint32(
            bytes,
            cursor + 38,
            'attributs externes'
        );
        const localOffset = uint32(bytes, cursor + 42, 'offset local');
        const next = cursor + 46 + nameLength + extraLength + commentLength;
        if (next > centralOffset + centralSize) {
            fail('entrée centrale ZIP tronquée');
        }
        if ((flags & 0x41) !== 0) fail('entrée ZIP chiffrée interdite');
        if (method !== 0 && method !== 8) {
            fail(`méthode de compression ZIP interdite : ${method}`);
        }
        if (
            compressedSize === 0xffffffff ||
            extractedSize === 0xffffffff ||
            localOffset === 0xffffffff ||
            startDisk !== 0
        ) {
            fail('entrée ZIP64 ou multi-disque interdite');
        }
        const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
        const name = decodeZipName(nameBytes);
        const unixType = (externalAttributes >>> 16) & 0xf000;
        if (madeByHost === 3 && unixType === 0xa000) {
            fail(
                `lien symbolique interdit dans l'archive : ${JSON.stringify(name)}`
            );
        }
        if (
            madeByHost === 3 &&
            unixType !== 0 &&
            unixType !== 0x4000 &&
            unixType !== 0x8000
        ) {
            fail(
                `fichier spécial interdit dans l'archive : ${JSON.stringify(name)}`
            );
        }
        if (
            madeByHost === 3 &&
            ((unixType === 0x4000 && !name.endsWith('/')) ||
                (unixType === 0x8000 && name.endsWith('/')))
        ) {
            fail(`type et nom ZIP incohérents : ${JSON.stringify(name)}`);
        }
        totalExtracted += extractedSize;
        if (
            !Number.isSafeInteger(totalExtracted) ||
            totalExtracted > maxExtractedBytes
        ) {
            fail(`taille décompressée ZIP hors limite : ${totalExtracted}`);
        }

        if (uint32(bytes, localOffset, 'en-tête local') !== 0x04034b50) {
            fail(`en-tête local ZIP absent pour ${JSON.stringify(name)}`);
        }
        const localFlags = uint16(bytes, localOffset + 6, 'drapeaux locaux');
        const localMethod = uint16(bytes, localOffset + 8, 'méthode locale');
        const localCrc32 = uint32(bytes, localOffset + 14, 'CRC local');
        const localCompressedSize = uint32(
            bytes,
            localOffset + 18,
            'taille locale compressée'
        );
        const localExtractedSize = uint32(
            bytes,
            localOffset + 22,
            'taille locale extraite'
        );
        const localNameLength = uint16(bytes, localOffset + 26, 'nom local');
        const localExtraLength = uint16(bytes, localOffset + 28, 'extra local');
        const localNameStart = localOffset + 30;
        const localName = bytes.subarray(
            localNameStart,
            localNameStart + localNameLength
        );
        if (
            localName.length !== localNameLength ||
            !localName.equals(nameBytes) ||
            localFlags !== flags ||
            localMethod !== method ||
            ((flags & 0x08) === 0 &&
                (localCrc32 !== crc32 ||
                    localCompressedSize !== compressedSize ||
                    localExtractedSize !== extractedSize))
        ) {
            fail(
                `nom local ou drapeaux différents du répertoire central : ${JSON.stringify(name)}`
            );
        }
        const dataStart = localNameStart + localNameLength + localExtraLength;
        const dataEnd = dataStart + compressedSize;
        if (dataEnd > centralOffset) {
            fail(`données ZIP hors limites pour ${JSON.stringify(name)}`);
        }
        localRanges.push({ start: localOffset, end: dataEnd });
        paths.push(name);
        cursor = next;
    }
    if (cursor !== centralOffset + centralSize) {
        fail('octets centraux ZIP non attribués');
    }
    localRanges.sort((left, right) => left.start - right.start);
    for (let index = 1; index < localRanges.length; index += 1) {
        if (localRanges[index].start < localRanges[index - 1].end) {
            fail('entrées ZIP locales qui se chevauchent');
        }
    }
    validateArchivePaths(paths);
    return paths;
}

function defaultUnzip(archivePath, destination) {
    execFileSync('/usr/bin/unzip', ['-q', archivePath, '-d', destination], {
        env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' },
        stdio: ['ignore', 'ignore', 'pipe'],
    });
}
