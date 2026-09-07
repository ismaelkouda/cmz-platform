import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

import {
    browserExecutablePath,
    browserPlatformKey,
    provisionBrowser,
    verifyArchive,
} from './browser-provisioning.mjs';
import { loadResolutionPolicy } from './resolution-policy.mjs';

const REPO_ROOT = new URL('../..', import.meta.url).pathname;
const ARCHIVE = Buffer.from('archive-factice');
const DIGEST = createHash('sha256').update(ARCHIVE).digest('hex');

function policyWith(sha256) {
    return {
        browser: {
            distribution: 'chrome-headless-shell',
            version: '152.0.7977.82',
            download_host: 'https://storage.googleapis.com',
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

test('une archive conforme est extraite puis réutilisée sans réseau', async (t) => {
    const root = await cacheRoot(t);
    const archive = 'chrome-headless-shell-mac-arm64/chrome-headless-shell';
    let downloads = 0;
    const call = () =>
        provisionBrowser({
            policy: policyWith(DIGEST),
            cacheRoot: root,
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
        browserExecutablePath(policyWith(DIGEST), root, 'darwin-arm64')
    );
    // L'archive téléchargée ne reste jamais sur le disque.
    assert.ok(
        !existsSync(join(dirname(first.executable), '..', 'archive.zip'))
    );

    const second = await call();
    assert.equal(second.downloaded, false);
    assert.equal(downloads, 1, 'aucun second téléchargement');
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
                platformKey: 'darwin-arm64',
                download,
            }),
        /incohérente avec la version/
    );
    assert.equal(downloads, 0, 'refus avant tout accès réseau');
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
