// X4-sécurité : les commandes du produit tournent confinées. Une même sonde,
// hors confinement, joint le réseau et lit hors du produit (elle est réelle) ;
// confinée, elle ne sort ni par le réseau, ni du produit, ni par
// l'environnement de l'hôte.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
    availableSandboxBackends,
    runConfined,
} from '../library-setup/sandbox.mjs';
import { runExternalApplicationCommand } from './core/application-workspace.mjs';
import { pathExists } from './core/external-application-paths.mjs';
import { runConfinedProductCommand } from './core/external-product-confinement.mjs';
import { fixtureParent } from './test-support/external-application-fixture.mjs';
import { repositoryRoot } from './validate-ir.mjs';

// CI de la PR #389 : sur Docker, sandbox.mjs ignore `extraEnv` et fixe
// CI=1. L'invocation réelle d'une commande du produit est construite pour les
// deux backends, sans Docker : macOS et Docker injectent le même environnement.
test('EXT01 : une commande du produit reçoit le même environnement sur macOS et Docker', async (t) => {
    const root = await fixtureParent(t);
    const observed = {};
    await runConfinedProductCommand(process.execPath, ['--version'], root, {
        workspaceRoot: repositoryRoot,
        backend: 'macos',
        output: { write: () => true },
        run: (options) => {
            for (const backend of ['macos', 'docker'])
                runConfined({
                    ...options,
                    backend,
                    spawn: (executable, argv, spawned) => {
                        observed[backend] = { argv, env: spawned.env };
                        return { status: 0, stdout: '', stderr: '' };
                    },
                });
            return { status: 0, stdout: '', stderr: '' };
        },
    });
    const docker = Object.fromEntries(
        observed.docker.argv
            .filter((argument, index, all) => all[index - 1] === '--env')
            .map((argument) => argument.split(/=(.*)/s).slice(0, 2))
    );
    for (const key of [
        'CI',
        'NX_NO_CLOUD',
        'PATH',
        'NX_DAEMON',
        'NX_ISOLATE_PLUGINS',
    ])
        assert.equal(observed.macos.env[key], docker[key], key);
    assert.equal(docker.CI, '1');
    assert.equal(docker.NX_NO_CLOUD, 'true');
});

test('EXT01 : le vrai enfant conserve le graphe Nx et ses chemins confinés', async (t) => {
    if (!availableSandboxBackends().length)
        return t.skip('aucun backend de confinement disponible');
    const root = await fixtureParent(t);
    const args = [
        '--input-type=module',
        '--eval',
        `
import assert from 'node:assert/strict';
import { realpathSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = process.cwd();
assert.equal(process.env.NX_CACHE_PROJECT_GRAPH, undefined, 'NX_GRAPH_DISABLED');
assert.equal(process.env.NX_DAEMON, 'false');
assert.equal(process.env.NX_ISOLATE_PLUGINS, 'false');
assert.equal(process.env.NX_NO_CLOUD, 'true');
assert.equal(process.env.CI, '1');
assert.equal(process.env.PATH, '');
assert.equal(process.env.NODE_OPTIONS, undefined);
for (const [key, suffix] of Object.entries({
    NX_CACHE_DIRECTORY: 'node_modules/.cmz-nx-cache',
    NX_WORKSPACE_DATA_DIRECTORY: 'node_modules/.cmz-nx-workspace-data',
    NX_NATIVE_FILE_CACHE_DIRECTORY: 'node_modules/.cmz-nx-native-file-cache',
    TMPDIR: 'tmp',
    TMP: 'tmp',
    TEMP: 'tmp',
})) {
    const expected = join(root, suffix);
    assert.equal(resolve(process.env[key]), expected, key);
    assert.equal(realpathSync(expected), expected, key);
    assert.ok(statSync(expected).isDirectory(), key);
}
// HOME jetable, hors du produit et en lecture seule.
const home = resolve(process.env.HOME);
assert.ok(!home.startsWith(root + '/'), 'HOME hors du produit');
assert.throws(() => writeFileSync(join(home, 'x'), 'x'));
process.stderr.write('EXT01_NATIVE_CHILD_ENV=PASS\\n');
`,
    ];
    await runExternalApplicationCommand(process.execPath, args, root);
});

// X4-sécurité : une commande du produit exécute du code écrit par d'autres (la
// spec d'un réalisateur). Le même enfant, lancé hors confinement, atteint le
// réseau et lit hors du produit : la sonde est réelle. Confiné, tout est bloqué.
const ESCAPE_PROBE = `
import { connect } from 'node:net';
import { readFileSync, writeFileSync } from 'node:fs';
const [recordPath, outsideRead, outsideWrite, port, ...hosts] = process.argv.slice(1);
const attempt = (run) => { try { run(); return 'allowed'; } catch (error) { return 'blocked:' + (error.code ?? 'error'); } };
const tcp = (host) => new Promise((done) => {
    const socket = connect({ host, port: Number(port) });
    socket.setTimeout(3000, () => { socket.destroy(); done('blocked:timeout'); });
    socket.on('connect', () => { socket.destroy(); done('allowed'); });
    socket.on('error', (error) => done('blocked:' + (error.code ?? 'error')));
});
const record = {
    sentinel: process.env.CMZ_PROBE_SECRET ?? null,
    readOutside: attempt(() => readFileSync(outsideRead)),
    writeOutside: attempt(() => writeFileSync(outsideWrite, 'x')),
    writeSources: attempt(() => writeFileSync('apps/escape.txt', 'x')),
    writeOwned: attempt(() => writeFileSync('.cmz/escape.txt', 'x')),
    writeTool: attempt(() => writeFileSync('node_modules/vitest/escape.txt', 'x')),
    writeCache: attempt(() => writeFileSync('tmp/cache.txt', 'x')),
};
for (const host of hosts) record['tcp ' + host] = await tcp(host);
writeFileSync(recordPath, JSON.stringify(record));
`;

test('X4-sécurité : une commande du produit ne sort ni par le réseau, ni du produit, ni par l’environnement', async (t) => {
    if (!availableSandboxBackends().length)
        return t.skip('aucun backend de confinement disponible');
    const parent = await fixtureParent(t);
    const root = join(parent, 'product');
    const outside = join(parent, 'outside');
    for (const path of [
        'apps',
        '.cmz',
        'node_modules/vitest',
        'tmp',
        'unconfined',
    ])
        await mkdir(join(root, path), { recursive: true });
    await mkdir(outside);
    await writeFile(join(outside, 'witness.txt'), 'outside-witness');
    let hits = 0;
    const server = createServer();
    server.on('connection', (socket) => {
        hits += 1;
        socket.destroy();
    });
    await new Promise((done) => server.listen(0, '0.0.0.0', done));
    t.after(() => server.close());
    const hosts = [
        '127.0.0.1',
        ...Object.values(networkInterfaces())
            .flat()
            .filter((entry) => entry.family === 'IPv4' && !entry.internal)
            .map((entry) => entry.address)
            .slice(0, 1),
    ];
    const probe = (record) => [
        '--input-type=module',
        '--eval',
        ESCAPE_PROBE,
        record,
        join(outside, 'witness.txt'),
        join(outside, 'written.txt'),
        String(server.address().port),
        ...hosts,
    ];
    // Témoin hors confinement : la sonde atteint bien le serveur et le dehors.
    const control = await promisify(execFile)(
        process.execPath,
        probe(join(root, 'unconfined/record.json')),
        { cwd: root, env: { ...process.env, CMZ_PROBE_SECRET: 'leak' } }
    ).then(
        () => 0,
        (error) => error
    );
    assert.equal(control, 0);
    const open = JSON.parse(
        await readFile(join(root, 'unconfined/record.json'), 'utf8')
    );
    assert.equal(open.sentinel, 'leak');
    assert.equal(open.readOutside, 'allowed');
    for (const host of hosts) assert.equal(open[`tcp ${host}`], 'allowed');
    assert.equal(hits, hosts.length);
    await rm(join(outside, 'written.txt'));
    for (const path of ['apps', '.cmz', 'node_modules/vitest', 'tmp'])
        await rm(join(root, path, path === 'tmp' ? 'cache.txt' : 'escape.txt'));
    hits = 0;
    // Confiné : rien ne sort, seuls les caches restent inscriptibles.
    process.env.CMZ_PROBE_SECRET = 'leak';
    t.after(() => delete process.env.CMZ_PROBE_SECRET);
    const output = { text: '', write: (chunk) => (output.text += chunk) };
    await runExternalApplicationCommand(
        process.execPath,
        probe(join(root, 'tmp/record.json')),
        root,
        { output }
    );
    const confined = JSON.parse(
        await readFile(join(root, 'tmp/record.json'), 'utf8')
    );
    assert.equal(confined.sentinel, null);
    for (const key of [
        'readOutside',
        'writeOutside',
        'writeSources',
        'writeOwned',
        'writeTool',
        ...hosts.map((host) => `tcp ${host}`),
    ])
        assert.match(confined[key], /^blocked:/, key);
    assert.equal(confined.writeCache, 'allowed');
    await new Promise((done) => setTimeout(done, 100));
    assert.equal(hits, 0);
    assert.equal(await pathExists(join(outside, 'written.txt')), false);
    // Échec d'une commande : message fermé, sans chemin.
    const failure = await runExternalApplicationCommand(
        process.execPath,
        ['--eval', 'process.exit(3)'],
        root,
        { output }
    ).catch((error) => error);
    assert.equal(
        failure.message,
        'external application: product command failed under confinement (code 3)'
    );
    // Hors du nœud qualifié, rien n'est lancé.
    await assert.rejects(
        runExternalApplicationCommand('/bin/sh', ['-c', 'true'], root),
        /product command must run the qualified node/
    );
});
