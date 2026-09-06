import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    chmodSync,
    existsSync,
    lstatSync,
    mkdirSync,
    realpathSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { arch, platform, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

function fail(message) {
    throw new Error(`library browser: ${message}`);
}

/**
 * Le moteur de rendu est la SEULE dépendance qui ne vient pas du registre npm :
 * il est téléchargé hors bande, donc hors du modèle d'intégrité de bun.lock.
 * L'extension de confiance est rendue explicite et vérifiable — hôte figé par la
 * politique, empreinte sha256 de l'archive vérifiée AVANT toute extraction, et
 * hash de la politique déjà présent dans le plan_id. Une archive dont
 * l'empreinte diverge n'est jamais dézippée : elle est supprimée.
 *
 * Le binaire est mis en cache hors du candidat (93 Mo sur macOS, 114 Mo sur
 * Linux : le recopier à chaque exécution serait absurde) et n'est monté qu'en
 * LECTURE dans le profil d'exécution.
 */
export function browserPlatformKey({
    osPlatform = platform(),
    osArch = arch(),
} = {}) {
    if (osPlatform === 'darwin' && osArch === 'arm64') return 'darwin-arm64';
    if (osPlatform === 'linux' && osArch === 'x64') return 'linux-x64';
    fail(`plateforme non couverte par la politique : ${osPlatform}/${osArch}`);
}

export function browserCacheRoot(requestedRoot) {
    const parent = requestedRoot
        ? realpathSync(dirname(requestedRoot))
        : realpathSync(tmpdir());
    const root = requestedRoot
        ? join(parent, requestedRoot.split('/').at(-1))
        : join(parent, 'cmz-library-browsers-v1');
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
    if (!archive) {
        fail(`aucune archive épinglée pour ${platformKey}`);
    }
    if (!archive.url.startsWith(`${browser.download_host}/`)) {
        fail(`archive hors de l'hôte autorisé : ${archive.url}`);
    }
    if (!archive.url.includes(`/${browser.version}/`)) {
        fail(`archive incohérente avec la version ${browser.version}`);
    }
    return archive;
}

export function browserExecutablePath(policy, cacheRoot, platformKey) {
    const archive = archiveOf(policy, platformKey);
    return join(
        cacheRoot,
        `${policy.browser.distribution}-${policy.browser.version}-${platformKey}`,
        archive.executable
    );
}

/**
 * Idempotent : si le binaire attendu est déjà présent et exécutable, aucun
 * accès réseau n'a lieu. Le téléchargement n'est fait qu'une fois par version.
 */
export async function provisionBrowser({
    policy,
    cacheRoot,
    platformKey = browserPlatformKey(),
    download = defaultDownload,
    unzip = defaultUnzip,
}) {
    const root = browserCacheRoot(cacheRoot);
    const archive = archiveOf(policy, platformKey);
    const target = join(
        root,
        `${policy.browser.distribution}-${policy.browser.version}-${platformKey}`
    );
    const executable = join(target, archive.executable);
    if (existsSync(executable)) {
        const stats = lstatSync(executable);
        if (stats.isSymbolicLink() || !stats.isFile()) {
            fail('binaire navigateur en cache non régulier');
        }
        return { executable, root, downloaded: false };
    }

    const bytes = await download(archive.url);
    verifyArchive(bytes, archive.sha256);

    const staging = `${target}.tmp-${process.pid}`;
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true, mode: 0o700 });
    const archivePath = join(staging, 'archive.zip');
    writeFileSync(archivePath, bytes, { mode: 0o600 });
    try {
        unzip(archivePath, staging);
        const staged = join(staging, archive.executable);
        if (!existsSync(staged) || lstatSync(staged).isSymbolicLink()) {
            fail(`archive sans binaire attendu : ${archive.executable}`);
        }
        chmodSync(staged, 0o700);
        rmSync(archivePath, { force: true });
        renameSync(staging, target);
    } catch (error) {
        rmSync(staging, { recursive: true, force: true });
        throw error;
    }
    return { executable, root, downloaded: true };
}

async function defaultDownload(url) {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
        fail(`téléchargement refusé (${response.status}) : ${url}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

function defaultUnzip(archivePath, destination) {
    execFileSync('/usr/bin/unzip', ['-q', archivePath, '-d', destination], {
        env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' },
        stdio: ['ignore', 'ignore', 'pipe'],
    });
}
