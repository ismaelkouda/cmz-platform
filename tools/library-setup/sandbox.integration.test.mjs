import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { loadResolutionPolicy } from './resolution-policy.mjs';
import { runConfined, selectSandboxBackend } from './sandbox.mjs';

const repositoryRoot = new URL('../..', import.meta.url).pathname;

async function fixture(t) {
    const root = await realpath(
        await mkdtemp(join(tmpdir(), 'cmz-sandbox-integration-'))
    );
    t.after(() => rm(root, { recursive: true, force: true }));
    const paths = {
        repository: repositoryRoot,
        candidate: join(root, 'candidate'),
        cache: join(root, 'cache'),
        home: join(root, 'home'),
    };
    for (const path of [paths.candidate, paths.cache, paths.home])
        await mkdir(path, { mode: 0o700 });
    await writeFile(join(paths.cache, 'secret'), 'cache-secret');
    return paths;
}

test('les attaques sont bloquées par le backend OS réel', async (t) => {
    const paths = await fixture(t);
    const { policy, errors } = loadResolutionPolicy(repositoryRoot);
    assert.deepEqual(errors, []);
    const backend = selectSandboxBackend();
    const forbiddenRepository =
        backend === 'docker'
            ? '/host-repository-not-mounted/package.json'
            : join(paths.repository, 'package.json');
    const forbiddenCache =
        backend === 'docker'
            ? '/cmz-cache/secret'
            : join(paths.cache, 'secret');
    const repositoryTarget =
        backend === 'docker'
            ? '/host-repository-not-mounted'
            : paths.repository;
    const child = String.raw`
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const result = { credentials: Object.keys(process.env).filter((key) => /(TOKEN|SECRET|PASSWORD|AUTH|SSH|GIT_|NPM_)/i.test(key)) };
try { fs.writeFileSync(process.cwd() + '/allowed', 'ok'); result.candidateWrite = true; } catch (error) { result.candidateWrite = error.code; }
try { fs.readFileSync(${JSON.stringify(forbiddenRepository)}); result.repositoryRead = true; } catch (error) { result.repositoryRead = error.code; }
try { fs.writeFileSync(${JSON.stringify(forbiddenRepository)}, 'bad'); result.repositoryWrite = true; } catch (error) { result.repositoryWrite = error.code; }
try { fs.readFileSync(${JSON.stringify(forbiddenCache)}); result.cacheRead = true; } catch (error) { result.cacheRead = error.code; }
try { fs.writeFileSync(process.env.HOME + '/forbidden', 'bad'); result.homeWrite = true; } catch (error) { result.homeWrite = error.code; }
try { fs.symlinkSync(${JSON.stringify(repositoryTarget)}, process.cwd() + '/escape'); fs.readFileSync(process.cwd() + '/escape/secret'); result.symlinkRead = true; } catch (error) { result.symlinkRead = error.code; }
const nested = spawnSync(process.execPath, ['-e', ${JSON.stringify(`require('node:fs').writeFileSync(${JSON.stringify(forbiddenRepository)}, 'nested')`)}]);
result.subprocessWrite = nested.status === 0;
const timer = setTimeout(() => { result.network = 'timeout'; console.log(JSON.stringify(result)); }, 5000);
fetch('https://example.com').then(() => { clearTimeout(timer); result.network = true; console.log(JSON.stringify(result)); }).catch((error) => { clearTimeout(timer); result.network = error.cause?.code || error.name; console.log(JSON.stringify(result)); });
`;
    const execution = runConfined({
        backend,
        profile: 'execution',
        ...paths,
        hostExecutable: process.execPath,
        containerExecutable: '/usr/local/bin/node',
        argv: ['-e', child],
        policy,
    });
    assert.equal(execution.status, 0, execution.stderr);
    const observed = JSON.parse(execution.stdout.trim());
    assert.equal(observed.candidateWrite, true);
    assert.notEqual(observed.repositoryRead, true);
    assert.notEqual(observed.repositoryWrite, true);
    assert.notEqual(observed.cacheRead, true);
    assert.notEqual(observed.homeWrite, true);
    assert.notEqual(observed.symlinkRead, true);
    assert.equal(observed.subprocessWrite, false);
    assert.notEqual(observed.network, true);
    assert.deepEqual(observed.credentials, []);
});

test('le profil de résolution exécute uniquement le Bun épinglé', async (t) => {
    const paths = await fixture(t);
    const { policy, errors } = loadResolutionPolicy(repositoryRoot);
    assert.deepEqual(errors, []);
    const backend = selectSandboxBackend();
    const resolution = runConfined({
        backend,
        profile: 'resolution',
        ...paths,
        hostExecutable: realpathSync(
            execFileSync('which', ['bun'], { encoding: 'utf8' }).trim()
        ),
        containerExecutable: '/usr/local/bin/bun',
        argv: ['--version'],
        policy,
    });
    assert.equal(resolution.status, 0, resolution.stderr);
    assert.equal(resolution.stdout.trim(), '1.3.14');
});

test('le profil de résolution refuse le vrai HOME et le vrai dépôt malgré le réseau ouvert', async (t) => {
    const paths = await fixture(t);
    const { policy, errors } = loadResolutionPolicy(repositoryRoot);
    assert.deepEqual(errors, []);
    const backend = selectSandboxBackend();
    const forbiddenHome =
        backend === 'docker' ? '/host-home-not-mounted' : homedir();
    const forbiddenRepository =
        backend === 'docker' ? '/host-repository-not-mounted' : repositoryRoot;
    const child = String.raw`
const fs = require('node:fs');
const result = {};
try { fs.readdirSync(${JSON.stringify(forbiddenHome)}); result.realHomeRead = true; } catch (error) { result.realHomeRead = error.code; }
try { fs.readdirSync(${JSON.stringify(forbiddenRepository)}); result.realRepositoryRead = true; } catch (error) { result.realRepositoryRead = error.code; }
try { fs.writeFileSync(process.env.HOME + '/allowed', 'ok'); result.disposableHomeWrite = true; } catch (error) { result.disposableHomeWrite = error.code; }
try { const response = await fetch('https://registry.npmjs.org/bun'); result.network = response.status; } catch (error) { result.network = error.cause?.code || error.name; }
console.log(JSON.stringify(result));
`;
    const resolution = runConfined({
        backend,
        profile: 'resolution',
        ...paths,
        hostExecutable: realpathSync(
            execFileSync('which', ['bun'], { encoding: 'utf8' }).trim()
        ),
        containerExecutable: '/usr/local/bin/bun',
        argv: ['-e', child],
        policy,
    });
    assert.equal(resolution.status, 0, resolution.stderr);
    const observed = JSON.parse(resolution.stdout.trim());
    assert.notEqual(observed.realHomeRead, true);
    assert.notEqual(observed.realRepositoryRead, true);
    assert.equal(observed.disposableHomeWrite, true);
    assert.equal(observed.network, 200);
});

// Contre-épreuve du 2026-09-05. Nx recopie son binaire natif dans os.tmpdir()
// avant de le charger, et n'échoue PAS bruyamment quand la copie est refusée :
// il rend un module amputé, et l'appelant meurt plus loin sur
// « WorkspaceContext is not a constructor ». Le seul garde-fou solide est
// l'invariant sous-jacent : os.tmpdir() doit rester non inscriptible sous le
// profil d'exécution, et chaque emplacement que l'on désigne à Nx doit, lui,
// être réellement inscriptible depuis l'intérieur du bac à sable — vérifié sur
// le backend réel, pas sur un mock.
test('sous le profil d’exécution, tmpdir est fermé et les emplacements Nx sont ouverts', async (t) => {
    const paths = await fixture(t);
    const { policy, errors } = loadResolutionPolicy(repositoryRoot);
    assert.deepEqual(errors, []);
    const backend = selectSandboxBackend();
    const child = String.raw`
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const result = { directories: {} };
try {
    fs.writeFileSync(path.join(os.tmpdir(), 'cmz-tmpdir-probe'), 'x');
    result.tmpdirWrite = true;
} catch (error) { result.tmpdirWrite = error.code; }
for (const key of ['NX_CACHE_DIRECTORY', 'NX_WORKSPACE_DATA_DIRECTORY', 'NX_NATIVE_FILE_CACHE_DIRECTORY']) {
    const value = process.env[key];
    if (!value) { result.directories[key] = 'undefined'; continue; }
    try {
        fs.mkdirSync(value, { recursive: true });
        fs.writeFileSync(path.join(value, 'probe'), 'x');
        result.directories[key] = true;
    } catch (error) { result.directories[key] = error.code; }
}
console.log(JSON.stringify(result));
`;
    const execution = runConfined({
        backend,
        profile: 'execution',
        ...paths,
        hostExecutable: process.execPath,
        containerExecutable: '/usr/local/bin/node',
        argv: ['-e', child],
        policy,
    });
    assert.equal(execution.status, 0, execution.stderr);
    const observed = JSON.parse(execution.stdout.trim());
    assert.notEqual(
        observed.tmpdirWrite,
        true,
        'tmpdir doit rester non inscriptible'
    );
    assert.deepEqual(observed.directories, {
        NX_CACHE_DIRECTORY: true,
        NX_WORKSPACE_DATA_DIRECTORY: true,
        NX_NATIVE_FILE_CACHE_DIRECTORY: true,
    });
});

// Le moteur de rendu exige des services système que le profil nu refuse — sans
// eux Chromium meurt en SIGSEGV. Ces permissions ne doivent RIEN rouvrir
// d'autre : ce test le vérifie sur le backend réel, avec le profil `renderer`
// activé, en tentant les mêmes attaques que la suite principale.
test('le profil moteur de rendu n’ouvre ni réseau, ni HOME réel, ni dépôt', async (t) => {
    const paths = await fixture(t);
    const { policy, errors } = loadResolutionPolicy(repositoryRoot);
    assert.deepEqual(errors, []);
    const backend = selectSandboxBackend();
    if (backend !== 'macos') return;
    const child = String.raw`
const fs = require('node:fs');
const result = {};
try { fs.readdirSync(${JSON.stringify(homedir())}); result.realHomeRead = true; } catch (error) { result.realHomeRead = error.code; }
try { fs.readdirSync(${JSON.stringify(repositoryRoot)}); result.repositoryRead = true; } catch (error) { result.repositoryRead = error.code; }
try { fs.writeFileSync('/tmp/cmz-renderer-escape', 'x'); result.outsideWrite = true; } catch (error) { result.outsideWrite = error.code; }
try { fs.writeFileSync(process.cwd() + '/allowed', 'ok'); result.candidateWrite = true; } catch (error) { result.candidateWrite = error.code; }
const timer = setTimeout(() => { result.network = 'timeout'; console.log(JSON.stringify(result)); }, 5000);
fetch('https://registry.npmjs.org/bun').then((response) => { clearTimeout(timer); result.network = response.status; console.log(JSON.stringify(result)); }).catch((error) => { clearTimeout(timer); result.network = error.cause?.code || error.name; console.log(JSON.stringify(result)); });
`;
    const execution = runConfined({
        backend,
        profile: 'execution',
        ...paths,
        hostExecutable: process.execPath,
        containerExecutable: '/usr/local/bin/node',
        argv: ['-e', child],
        policy,
        renderer: true,
    });
    assert.equal(execution.status, 0, execution.stderr);
    const observed = JSON.parse(execution.stdout.trim());
    assert.notEqual(observed.realHomeRead, true, 'HOME réel lisible');
    assert.notEqual(observed.repositoryRead, true, 'dépôt lisible');
    assert.notEqual(observed.outsideWrite, true, 'écriture hors candidat');
    assert.notEqual(observed.network, 200, 'réseau joignable');
    assert.equal(observed.candidateWrite, true);
});
