import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    chmodSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import {
    browserExecutablePath,
    browserPlatformKey,
    downloadExactUrl,
    inspectZipArchive,
    provisionBrowser,
    validateArchivePaths,
    verifyArchive,
} from './browser-provisioning.mjs';
import { loadResolutionPolicy } from './resolution-policy.mjs';

const REPO_ROOT = new URL('../..', import.meta.url).pathname;
const ARCHIVE = storedZip(
    'chrome-headless-shell-mac-arm64/chrome-headless-shell'
);
const DIGEST = createHash('sha256').update(ARCHIVE).digest('hex');

function policyWith(sha256) {
    return {
        browser: {
            distribution: 'chrome-headless-shell',
            version: '152.0.7977.82',
            download_host: 'https://storage.googleapis.com',
            download_timeout_ms: 1000,
            max_archive_bytes: 1024,
            max_extracted_bytes: 4096,
            max_archive_entries: 16,
            archives: {
                'darwin-arm64': {
                    url: 'https://storage.googleapis.com/chrome-for-testing-public/152.0.7977.82/mac-arm64/chrome-headless-shell-mac-arm64.zip',
                    sha256,
                    executable:
                        'chrome-headless-shell-mac-arm64/chrome-headless-shell',
                },
            },
        },
    };
}

function storedZipEntry(
    name,
    { externalAttributes = 0, localName = name, extractedSize = 1 } = {}
) {
    const nameBytes = Buffer.from(name);
    const localNameBytes = Buffer.from(localName);
    const content = Buffer.from('x');
    const local = Buffer.alloc(30 + localNameBytes.length + content.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(content.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(localNameBytes.length, 26);
    localNameBytes.copy(local, 30);
    content.copy(local, 30 + localNameBytes.length);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(3 << 8, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(content.length, 20);
    central.writeUInt32LE(extractedSize, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(externalAttributes >>> 0, 38);
    nameBytes.copy(central, 46);
    return { local, central };
}

function storedZip(name, options) {
    const { local, central } = storedZipEntry(name, options);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(central.length, 12);
    eocd.writeUInt32LE(local.length, 16);
    return Buffer.concat([local, central, eocd]);
}

async function cacheRoot(t) {
    const parent = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-browser-'))
    );
    t.after(() => rm(parent, { recursive: true, force: true }));
    return join(parent, 'cache');
}

function fakeUnzip(archive) {
    return (archivePath, destination) => {
        const target = join(destination, archive);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, 'binaire');
    };
}

test('la politique du dépôt épingle chaque archive par empreinte et par hôte', () => {
    const { policy, errors } = loadResolutionPolicy(REPO_ROOT);
    assert.deepEqual(errors, []);
    assert.equal(
        policy.browser.download_host,
        'https://storage.googleapis.com'
    );
    for (const [key, archive] of Object.entries(policy.browser.archives)) {
        assert.match(archive.sha256, /^[a-f0-9]{64}$/, key);
        assert.ok(
            archive.url.startsWith(`${policy.browser.download_host}/`),
            key
        );
        assert.ok(archive.url.includes(`/${policy.browser.version}/`), key);
    }
    assert.deepEqual(Object.keys(policy.browser.archives).sort(), [
        'darwin-arm64',
        'linux-x64',
    ]);
});

// Le cœur de l'extension de confiance : une archive dont l'empreinte diverge
// ne doit JAMAIS être extraite. Sans cette vérification, l'hôte de
// téléchargement remplacerait le moteur de rendu par n'importe quel binaire.
test('une archive à l’empreinte divergente n’est jamais extraite', async (t) => {
    const root = await cacheRoot(t);
    let unzipCalls = 0;
    await assert.rejects(
        () =>
            provisionBrowser({
                policy: policyWith('0'.repeat(64)),
                cacheRoot: root,
                extractionRoot: join(dirname(root), 'extraction-invalid'),
                platformKey: 'darwin-arm64',
                download: async () => ARCHIVE,
                unzip: () => {
                    unzipCalls += 1;
                },
            }),
        /empreinte d'archive inattendue/
    );
    assert.equal(unzipCalls, 0);
    assert.deepEqual(readdirSync(root), []);
});

test('une archive conforme est rehachée puis extraite à neuf sans second réseau', async (t) => {
    const root = await cacheRoot(t);
    const archive = 'chrome-headless-shell-mac-arm64/chrome-headless-shell';
    let downloads = 0;
    let extraction = 0;
    const call = () =>
        provisionBrowser({
            policy: policyWith(DIGEST),
            cacheRoot: root,
            extractionRoot: join(
                dirname(root),
                `extraction-${(extraction += 1)}`
            ),
            platformKey: 'darwin-arm64',
            download: async () => {
                downloads += 1;
                return ARCHIVE;
            },
            unzip: fakeUnzip(archive),
        });

    const first = await call();
    assert.equal(first.downloaded, true);
    assert.equal(downloads, 1);
    assert.ok(existsSync(first.executable));
    assert.equal(
        first.executable,
        browserExecutablePath(policyWith(DIGEST), first.root, 'darwin-arm64')
    );
    assert.equal(readFileSync(first.executable, 'utf8'), 'binaire');
    chmodSync(first.executable, 0o600);
    writeFileSync(first.executable, 'cache extrait altéré', { mode: 0o600 });

    const second = await call();
    assert.equal(second.downloaded, false);
    assert.equal(downloads, 1, 'aucun second téléchargement');
    assert.notEqual(second.root, first.root);
    assert.equal(readFileSync(second.executable, 'utf8'), 'binaire');
    assert.equal(
        readdirSync(root).filter((path) => path.endsWith('.zip')).length,
        1
    );
});

test('la racine éphémère accepte un alias canonique du parent, jamais une cible existante', async (t) => {
    const root = await cacheRoot(t);
    const extraction = join(dirname(root), 'extraction-canonique');
    const first = await provisionBrowser({
        policy: policyWith(DIGEST),
        cacheRoot: root,
        extractionRoot: extraction,
        platformKey: 'darwin-arm64',
        download: async () => ARCHIVE,
        unzip: fakeUnzip(
            'chrome-headless-shell-mac-arm64/chrome-headless-shell'
        ),
    });
    assert.ok(existsSync(first.executable));
    await assert.rejects(
        provisionBrowser({
            policy: policyWith(DIGEST),
            cacheRoot: root,
            extractionRoot: extraction,
            platformKey: 'darwin-arm64',
            download: async () => ARCHIVE,
            unzip: fakeUnzip(
                'chrome-headless-shell-mac-arm64/chrome-headless-shell'
            ),
        }),
        /déjà existante/
    );
});

test('une archive persistante altérée est refusée avant extraction', async (t) => {
    const root = await cacheRoot(t);
    const policy = policyWith(DIGEST);
    await provisionBrowser({
        policy,
        cacheRoot: root,
        extractionRoot: join(dirname(root), 'extraction-first'),
        platformKey: 'darwin-arm64',
        download: async () => ARCHIVE,
        unzip: fakeUnzip(
            'chrome-headless-shell-mac-arm64/chrome-headless-shell'
        ),
    });
    const archivePath = join(
        root,
        readdirSync(root).find((path) => path.endsWith('.zip'))
    );
    writeFileSync(archivePath, 'altérée', { mode: 0o600 });
    let unzipCalls = 0;
    await assert.rejects(
        provisionBrowser({
            policy,
            cacheRoot: root,
            extractionRoot: join(dirname(root), 'extraction-second'),
            platformKey: 'darwin-arm64',
            download: async () => {
                throw new Error('réseau ne doit pas être appelé');
            },
            unzip: () => {
                unzipCalls += 1;
            },
        }),
        /empreinte d'archive inattendue/
    );
    assert.equal(unzipCalls, 0);
});

test('un arbre extrait inattendu est refusé et supprimé', async (t) => {
    const root = await cacheRoot(t);
    const extraction = join(dirname(root), 'extraction-inattendue');
    await assert.rejects(
        provisionBrowser({
            policy: policyWith(DIGEST),
            cacheRoot: root,
            extractionRoot: extraction,
            platformKey: 'darwin-arm64',
            download: async () => ARCHIVE,
            unzip: (archivePath, destination) => {
                fakeUnzip(
                    'chrome-headless-shell-mac-arm64/chrome-headless-shell'
                )(archivePath, destination);
                writeFileSync(join(destination, 'surprise'), 'non déclarée');
            },
        }),
        /arbre extrait différent du ZIP/
    );
    assert.equal(existsSync(extraction), false);
});

test('une archive hors hôte ou hors version est refusée avant tout téléchargement', async (t) => {
    const root = await cacheRoot(t);
    const wrongHost = policyWith(DIGEST);
    wrongHost.browser.archives['darwin-arm64'].url =
        'https://cdn.exemple.test/chrome-for-testing-public/152.0.7977.82/mac-arm64/chrome-headless-shell-mac-arm64.zip';
    let downloads = 0;
    const download = async () => {
        downloads += 1;
        return ARCHIVE;
    };
    await assert.rejects(
        () =>
            provisionBrowser({
                policy: wrongHost,
                cacheRoot: root,
                extractionRoot: join(dirname(root), 'wrong-host'),
                platformKey: 'darwin-arm64',
                download,
            }),
        /hors de l'hôte autorisé/
    );

    const wrongVersion = policyWith(DIGEST);
    wrongVersion.browser.version = '999.0.0.0';
    await assert.rejects(
        () =>
            provisionBrowser({
                policy: wrongVersion,
                cacheRoot: root,
                extractionRoot: join(dirname(root), 'wrong-version'),
                platformKey: 'darwin-arm64',
                download,
            }),
        /incohérente avec la version/
    );
    assert.equal(downloads, 0, 'refus avant tout accès réseau');
});

test('le téléchargement interdit redirection et dépassement annoncé ou réel', async () => {
    const options = {
        allowedOrigin: 'https://storage.googleapis.com',
        maxBytes: 8,
        timeoutMs: 1000,
    };
    const calls = [];
    const fetchImpl = async (_url, init) => {
        calls.push(init);
        return {
            ok: true,
            status: 200,
            url: 'https://storage.googleapis.com/archive.zip',
            headers: new Headers({ 'content-length': '4' }),
            body: (async function* () {
                yield Buffer.from('data');
            })(),
        };
    };
    assert.equal(
        (
            await downloadExactUrl(
                'https://storage.googleapis.com/archive.zip',
                { ...options, fetchImpl }
            )
        ).toString(),
        'data'
    );
    assert.equal(calls[0].redirect, 'error');

    let outsideCalls = 0;
    await assert.rejects(
        downloadExactUrl('https://evil.example/archive.zip', {
            ...options,
            fetchImpl: async () => {
                outsideCalls += 1;
            },
        }),
        /hors origine autorisée/
    );
    assert.equal(outsideCalls, 0, 'refus avant le premier octet réseau');

    await assert.rejects(
        downloadExactUrl('https://storage.googleapis.com/archive.zip', {
            ...options,
            fetchImpl: async () => ({
                ok: true,
                status: 200,
                url: 'https://evil.example/archive.zip',
                headers: new Headers(),
                body: [],
            }),
        }),
        /redirigée hors/
    );
    await assert.rejects(
        downloadExactUrl('https://storage.googleapis.com/archive.zip', {
            ...options,
            fetchImpl: async () => ({
                ok: true,
                status: 200,
                url: 'https://storage.googleapis.com/archive.zip',
                headers: new Headers({ 'content-length': '9' }),
                body: [],
            }),
        }),
        /annoncée trop grande/
    );
    await assert.rejects(
        downloadExactUrl('https://storage.googleapis.com/archive.zip', {
            ...options,
            fetchImpl: async () => ({
                ok: true,
                status: 200,
                url: 'https://storage.googleapis.com/archive.zip',
                headers: new Headers(),
                body: (async function* () {
                    yield Buffer.alloc(9);
                })(),
            }),
        }),
        /reçue trop grande/
    );
    for (const invalidLength of ['garbage', '-1', '1.5']) {
        await assert.rejects(
            downloadExactUrl('https://storage.googleapis.com/archive.zip', {
                ...options,
                fetchImpl: async () => ({
                    ok: true,
                    status: 200,
                    url: 'https://storage.googleapis.com/archive.zip',
                    headers: new Headers({
                        'content-length': invalidLength,
                    }),
                    body: [],
                }),
            }),
            /Content-Length invalide/
        );
    }
    await assert.rejects(
        downloadExactUrl('https://storage.googleapis.com/archive.zip', {
            ...options,
            fetchImpl: async () => {
                throw new Error('socket cassée');
            },
        }),
        /library browser: téléchargement impossible: socket cassée/
    );
    await assert.rejects(
        downloadExactUrl('https://storage.googleapis.com/archive.zip', {
            ...options,
            timeoutMs: 10,
            fetchImpl: async (_url, { signal }) =>
                new Promise((_resolve, reject) => {
                    signal.addEventListener('abort', () => {
                        reject(new Error('annulée'));
                    });
                }),
        }),
        /téléchargement expiré après 10 ms/
    );
});

test('la liste ZIP refuse les collisions de chemin et les fichiers ancêtres', () => {
    assert.throws(
        () => validateArchivePaths(['x', 'x/evil']),
        /fichier ancêtre/
    );
    assert.throws(
        () => validateArchivePaths(['x/evil', 'x']),
        /fichier ancêtre/
    );
    assert.throws(
        () => validateArchivePaths(['Dossier/fichier', 'dossier/FICHIER']),
        /dupliqué/
    );
    assert.throws(() => validateArchivePaths(['e\u0301/fichier']), /non sûr/);
    assert.doesNotThrow(() =>
        validateArchivePaths(['chrome/', 'chrome/bin/', 'chrome/bin/browser'])
    );
});

test('le ZIP est inspecté en binaire avant extraction', () => {
    const limits = { maxEntries: 4, maxExtractedBytes: 16 };
    assert.deepEqual(inspectZipArchive(storedZip('bin/browser'), limits), [
        'bin/browser',
    ]);
    assert.throws(
        () => inspectZipArchive(storedZip('bin\ninnocent'), limits),
        /chemin d'archive non sûr/
    );
    assert.throws(
        () =>
            inspectZipArchive(
                storedZip('bin/link', {
                    externalAttributes: (0xa000 << 16) >>> 0,
                }),
                limits
            ),
        /lien symbolique/
    );
    assert.throws(
        () =>
            inspectZipArchive(
                storedZip('bin/browser', { localName: 'bin/other' }),
                limits
            ),
        /nom local.*répertoire central/
    );
    assert.throws(
        () =>
            inspectZipArchive(
                storedZip('bin/browser', { extractedSize: 17 }),
                limits
            ),
        /taille décompressée ZIP hors limite/
    );
});

test('empreinte et plateformes couvertes sont explicites', () => {
    assert.equal(verifyArchive(ARCHIVE, DIGEST), DIGEST);
    assert.equal(
        browserPlatformKey({ osPlatform: 'darwin', osArch: 'arm64' }),
        'darwin-arm64'
    );
    assert.equal(
        browserPlatformKey({ osPlatform: 'linux', osArch: 'x64' }),
        'linux-x64'
    );
    // Le moteur tourne DANS le conteneur : l'archive suit le backend, pas
    // l'hôte. Un Mac pilotant Docker doit donc prendre l'archive Linux.
    assert.equal(
        browserPlatformKey({
            backend: 'docker',
            osPlatform: 'darwin',
            osArch: 'arm64',
        }),
        'linux-x64'
    );
    assert.throws(
        () => browserPlatformKey({ osPlatform: 'win32', osArch: 'x64' }),
        /non couverte par la politique/
    );
});
