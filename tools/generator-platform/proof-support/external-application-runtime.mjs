import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { stripVTControlCharacters } from 'node:util';

import semver from 'semver';

import {
    runConfined,
    selectSandboxBackend,
} from '../../library-setup/sandbox.mjs';
import { qualifyFrozenInstallation } from '../core/application-workspace-toolchain.mjs';
import {
    assertPhysicalPath,
    externalApplicationContext,
    isWithin,
    pathExists,
    readProductFile,
} from '../core/external-application-paths.mjs';
import {
    hash,
    TOOLS_ROOT,
} from '../test-support/external-application-fixture.mjs';

export async function proofSession(options) {
    const root = await assertPhysicalPath(options.proofRoot, { missing: true });
    if (
        isWithin(TOOLS_ROOT, root) ||
        isWithin(root, TOOLS_ROOT) ||
        (await pathExists(root))
    )
        throw new Error('La racine de preuve doit être neuve et hors atelier.');
    await externalApplicationContext({
        workspaceRoot: TOOLS_ROOT,
        targetRoot: root,
    });
    if (
        isWithin(await realpath(tmpdir()), root) ||
        isWithin('/private/tmp', root)
    )
        throw new Error(
            'Les preuves durables doivent être hors des répertoires temporaires.'
        );
    await assertPhysicalPath(dirname(root));
    const backend = options.backend ?? selectSandboxBackend();
    const policyPath = 'conventions/libraries/resolution-policy.json';
    const policyBytes = await readProductFile(TOOLS_ROOT, policyPath);
    const pinnedPolicy = execFileSync(
        'git',
        [
            '--no-optional-locks',
            'show',
            `3aabbe1b34cdcfdc9fce5da420f8558998f8d8c4:${policyPath}`,
        ],
        { cwd: TOOLS_ROOT }
    );
    assert.equal(
        hash(policyBytes),
        hash(pinnedPolicy),
        'Politique de confinement modifiée'
    );
    const policy = JSON.parse(policyBytes.toString('utf8'));
    const sourcePackage = JSON.parse(
        (await readProductFile(TOOLS_ROOT, 'package.json')).toString('utf8')
    );
    const hostNode = await realpath(process.execPath);
    let hostBun;
    if (backend === 'macos') {
        if (
            !options.bunExecutable ||
            options.bunExecutable !== resolve(options.bunExecutable)
        )
            throw new Error('--bun-executable absolu requis sur macOS.');
        hostBun = await realpath(options.bunExecutable);
        if (!(await lstat(hostBun)).isFile() || isWithin(TOOLS_ROOT, hostBun))
            throw new Error('Exécutable Bun extérieur régulier requis.');
    }
    await mkdir(root, { mode: 0o700 });
    const cache = resolve(root, 'package-cache');
    const home = resolve(root, 'empty-home');
    await mkdir(cache, { mode: 0o700 });
    await mkdir(home, { mode: 0o700 });
    const lines = [
        'EXT-01 / shells T1–T18 / données entièrement fictives',
        `backend=${backend}`,
        `policy_sha256=${hash(policyBytes)}`,
        'T19–T28 non qualifiés par cette preuve.',
    ];
    const report = resolve(root, 'report.txt');
    const save = () => writeFile(report, lines.join('\n') + '\n');
    await save();
    return {
        root,
        backend,
        policy,
        hostNode,
        hostBun,
        cache,
        home,
        lines,
        save,
        sourcePackage,
    };
}

export function record(
    session,
    label,
    result,
    { negative = false, diagnostic } = {}
) {
    const output = stripVTControlCharacters(result.stdout + result.stderr);
    const expected = negative
        ? Number.isInteger(result.status) &&
          result.status !== 0 &&
          (!diagnostic || diagnostic.test(output))
        : result.status === 0 && !result.signal;
    const status =
        result.status === null ? 'interrupted' : String(result.status);
    session.lines.push(`${expected ? 'PASS' : 'FAIL'} ${label} exit=${status}`);
    process.stdout.write(
        `${expected ? 'PASS' : 'FAIL'} ${label} exit=${status}\n`
    );
    if (!expected) {
        // Inputs are fictitious and the child has a clean environment, but
        // retain only diagnostic hashes in the durable report, never env/JSON.
        session.lines.push(`diagnostic_sha256=${hash(output)}`);
        throw new Error(
            `Échec de la preuve ${label}. Arrêt, sans relance automatique.`
        );
    }
    return result;
}

function argumentForProduct(root, value) {
    return typeof value === 'string' && isWithin(root, value)
        ? '{{candidate}}' +
              (value === root
                  ? ''
                  : '/' + relative(root, value).split('\\').join('/'))
        : value;
}

// mcr.microsoft.com/playwright@sha256:
// eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27
// Vérif. Claude 2026-10-16 22:29 : /usr/bin/node v24.20.0,
// /usr/local/bin/node absent de cette image.
const RENDER_NODE = '/usr/bin/node';

export function confinedNode(
    session,
    product,
    argv,
    { browser, timeoutMs = 300_000 } = {}
) {
    return (session.run ?? runConfined)({
        backend: session.backend,
        profile: 'execution',
        candidate: product,
        cache: session.cache,
        home: session.home,
        repository: TOOLS_ROOT,
        hostExecutable: session.hostNode,
        containerExecutable: browser ? RENDER_NODE : '/usr/local/bin/node',
        argv: argv.map((value) => argumentForProduct(product, value)),
        policy: session.policy,
        repositoryReadOnlyPaths: [],
        readOnlyPaths: browser ? [browser.root] : [],
        nxRoot: '.',
        renderer: Boolean(browser),
        allowLoopback: Boolean(browser),
        timeoutMs,
    });
}

export function qualifyNodeVersion(session, product, options = {}) {
    const phase = options.browser ? 'renderer' : 'execution';
    const result = record(
        session,
        `${phase}/Node-version`,
        confinedNode(session, product, ['--version'], options)
    );
    const version = result.stdout.trim();
    assert.ok(semver.satisfies(version, session.sourcePackage.engines.node));
    session.lines.push(`${options.browser ? 'renderer_' : ''}node=${version}`);
}

function nativeBin(plan, name, command) {
    const info = plan.installation.installed[name];
    assert.ok(info?.bin[command], 'Exécutable qualifié absent');
    return resolve(info.packageRoot, info.bin[command].path);
}

export function targetArguments(plan, target) {
    return [
        nativeBin(plan, 'nx', 'nx'),
        'run',
        `${plan.app_name}:${target}`,
        '--skipNxCache',
        '--outputStyle=stream',
    ];
}

export function compilerArguments(plan) {
    return [
        nativeBin(
            plan,
            plan.profile === 'angular-pwa'
                ? '@angular/compiler-cli'
                : 'typescript',
            plan.compiler
        ),
        '-p',
        resolve(plan.outputAbsolute, 'tsconfig.app.json'),
        '--noEmit',
    ];
}

export async function installRealPackages(session, workspace) {
    const product = workspace.productRoot;
    const base = {
        backend: session.backend,
        profile: 'resolution',
        candidate: product,
        cache: session.cache,
        home: session.home,
        repository: TOOLS_ROOT,
        hostExecutable: session.hostBun,
        containerExecutable: '/usr/local/bin/bun',
        policy: session.policy,
        repositoryReadOnlyPaths: [],
    };
    const version = record(
        session,
        'resolution/Bun-version',
        runConfined({ ...base, argv: ['--version'] })
    );
    assert.equal(
        version.stdout.trim(),
        session.sourcePackage.packageManager.split('@')[1]
    );
    await qualifyFrozenInstallation(workspace, (pass) =>
        record(
            session,
            `resolution/${relative(session.root, product)}/frozen-${pass}`,
            runConfined({
                ...base,
                argv: [
                    'install',
                    '--frozen-lockfile',
                    '--ignore-scripts',
                    '--backend=copyfile',
                    `--registry=${session.policy.allowed_registries[0]}`,
                ],
                timeoutMs: 900_000,
            })
        )
    );
    qualifyNodeVersion(session, product);
    session.lines.push(`bun=${version.stdout.trim()}`);
    await session.save();
}
