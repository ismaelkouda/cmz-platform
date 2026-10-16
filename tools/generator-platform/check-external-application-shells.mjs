#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
    lstat,
    mkdir,
    readFile,
    realpath,
    rename,
    rm,
    writeFile,
} from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

import semver from 'semver';

import { provisionBrowser } from '../library-setup/browser-provisioning.mjs';
import {
    runConfined,
    selectSandboxBackend,
} from '../library-setup/sandbox.mjs';
import {
    planApplicationWorkspace,
    planExternalApplicationShell,
    publishApplicationWorkspace,
    publishExternalApplicationShell,
} from './core/application-workspace.mjs';
import { qualifyFrozenInstallation } from './core/application-workspace-toolchain.mjs';
import {
    assertPhysicalPath,
    assertSourceWeight,
    externalApplicationContext,
    isWithin,
    pathExists,
    readProductFile,
    verifyGeneratedTree,
} from './core/external-application-paths.mjs';
import {
    formatProofStop,
    hash,
    snapshotTree,
    TOOLS_ROOT,
    workspaceOptions,
    writeExternalDesign,
} from './test-support/external-application-fixture.mjs';

export function parseArgs(argv) {
    const options = {};
    const names = new Map([
        ['--proof-root', 'proofRoot'],
        ['--backend', 'backend'],
        ['--bun-executable', 'bunExecutable'],
    ]);
    for (let index = 0; index < argv.length; index += 1) {
        const key = names.get(argv[index]);
        const value = argv[++index];
        if (!key || options[key] || !value || value.startsWith('--'))
            throw new Error(
                'Arguments de preuve absents, inconnus ou répétés.'
            );
        options[key] = value;
    }
    if (!options.proofRoot || options.proofRoot !== resolve(options.proofRoot))
        throw new Error('--proof-root absolu canonique requis.');
    if (options.backend && !['macos', 'docker'].includes(options.backend))
        throw new Error('Backend non qualifié.');
    return options;
}

async function proofSession(options) {
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
            `3f5922287a6bda7c477e9b304136f14b9ae4c177:${policyPath}`,
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

function record(session, label, result, { negative = false, diagnostic } = {}) {
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

function confinedNode(
    session,
    product,
    argv,
    { browser, timeoutMs = 300_000 } = {}
) {
    return runConfined({
        backend: session.backend,
        profile: 'execution',
        candidate: product,
        cache: session.cache,
        home: session.home,
        repository: TOOLS_ROOT,
        hostExecutable: session.hostNode,
        containerExecutable: '/usr/local/bin/node',
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

function nativeBin(plan, name, command) {
    const info = plan.installation.installed[name];
    assert.ok(info?.bin[command], 'Exécutable qualifié absent');
    return resolve(info.packageRoot, info.bin[command].path);
}

function targetArguments(plan, target) {
    return [
        nativeBin(plan, 'nx', 'nx'),
        'run',
        `${plan.app_name}:${target}`,
        '--skipNxCache',
        '--outputStyle=stream',
    ];
}

function compilerArguments(plan) {
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

async function fileMutation(
    session,
    product,
    path,
    transform,
    run,
    diagnostic
) {
    const original = await readProductFile(product, path);
    const target = resolve(product, path);
    const label = `mutation/${path}`;
    record(session, `${label}/before`, await run());
    let failure;
    try {
        const changed = transform(original.toString('utf8'));
        assert.notEqual(
            changed,
            original.toString('utf8'),
            'Mutation sans effet'
        );
        await writeFile(target, changed);
        record(session, `${label}/red`, await run(), {
            negative: true,
            diagnostic,
        });
    } catch (error) {
        failure = error;
    } finally {
        await writeFile(target, original);
    }
    assert.equal(hash(await readProductFile(product, path)), hash(original));
    record(session, `${label}/restored`, await run());
    await session.save();
    if (failure) throw failure;
}

async function displacedEntry(session, product, path, run, diagnostic) {
    const source = resolve(product, path);
    assert.ok(isWithin(product, source));
    await assertPhysicalPath(dirname(source));
    const holdingRoot = resolve(session.root, 'displaced');
    await mkdir(holdingRoot, { recursive: true });
    const holding = resolve(holdingRoot, hash(path));
    assert.equal(await pathExists(holding), false);
    const label = `missing/${path}`;
    record(session, `${label}/before`, await run());
    let failure;
    try {
        await rename(source, holding);
        record(session, `${label}/red`, await run(), {
            negative: true,
            diagnostic,
        });
    } catch (error) {
        failure = error;
    } finally {
        await rename(holding, source);
    }
    record(session, `${label}/restored`, await run());
    await session.save();
    if (failure) throw failure;
}

async function qualifyMutations(session, product, plan) {
    const angular = plan.profile === 'angular-pwa';
    const publicPage = Object.keys(plan.files).find(
        (path) =>
            path.startsWith('src/app/pages/') &&
            path.endsWith(angular ? 'page.component.ts' : 'page.tsx')
    );
    assert.ok(publicPage, 'Page de fixture absente');
    const compile = () =>
        confinedNode(session, product, compilerArguments(plan));
    const lint = () =>
        confinedNode(session, product, targetArguments(plan, 'lint'));
    const unit = () =>
        confinedNode(session, product, targetArguments(plan, 'test'));
    await fileMutation(
        session,
        product,
        `${plan.output}/${publicPage}`,
        (value) => value + '\nexport const typeMutation: string = 1;\n',
        compile,
        /TS2322/
    );
    await fileMutation(
        session,
        product,
        `${plan.output}/${publicPage}`,
        (value) => value + '\nconsole.log("fictitious lint mutation");\n',
        lint,
        /no-console/
    );
    await fileMutation(
        session,
        product,
        `${plan.output}/${publicPage}`,
        (value) =>
            value +
            '\nexport function anyMutation(value: any) { return value; }\n',
        lint,
        /no-explicit-any/
    );
    await fileMutation(
        session,
        product,
        `${plan.output}/${publicPage}`,
        (value) => '/* eslint-disable no-debugger */\n' + value,
        lint,
        /Unused eslint-disable directive/
    );
    if (angular) {
        await fileMutation(
            session,
            product,
            `${plan.output}/${publicPage}`,
            (value) =>
                value.replace('</h1>', '</h1>{{ missingTemplateMember }}'),
            compile,
            /missingTemplateMember/
        );
    }
    const spec = `${plan.output}/src/app/${angular ? 'access.guard.spec.ts' : 'access-policy.spec.ts'}`;
    await fileMutation(
        session,
        product,
        spec,
        (value) =>
            value + '\nit("mutation-test", () => expect(true).toBe(false));\n',
        unit,
        /mutation-test/
    );
    await displacedEntry(
        session,
        product,
        `${plan.output}/tsconfig.app.json`,
        compile,
        /tsconfig.app.json/
    );
    await displacedEntry(
        session,
        product,
        'tsconfig.base.json',
        compile,
        /tsconfig.base.json/
    );
    await displacedEntry(
        session,
        product,
        `${plan.output}/eslint.config.mjs`,
        lint,
        /eslint.config|config file/
    );
    const dependency = angular ? '@angular/core' : '@vitejs/plugin-react';
    const dependencyCheck = angular
        ? compile
        : () =>
              confinedNode(
                  session,
                  product,
                  targetArguments(plan, 'build:production')
              );
    await displacedEntry(
        session,
        product,
        `node_modules/${dependency}`,
        dependencyCheck,
        new RegExp(dependency.replaceAll('/', '\\/'))
    );
    if (angular) {
        await displacedEntry(
            session,
            product,
            '.cmz/support/angular-unit-test.config.mjs',
            unit,
            /angular-unit-test.config/
        );
    } else {
        await displacedEntry(
            session,
            product,
            `${plan.output}/vite.config.mts`,
            dependencyCheck,
            /vite.config/
        );
    }
}

async function installRealPackages(session, workspace) {
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
    const nodeVersion = record(
        session,
        'execution/Node-version',
        confinedNode(session, product, ['--version'])
    );
    assert.ok(
        semver.satisfies(
            nodeVersion.stdout.trim(),
            session.sourcePackage.engines.node
        )
    );
    session.lines.push(
        `node=${nodeVersion.stdout.trim()}`,
        `bun=${version.stdout.trim()}`
    );
    await session.save();
}

async function instrumentProduct(session, product, browserFixture) {
    const proof = resolve(product, '.cmz/proof');
    assert.equal(await pathExists(proof), false);
    const witness = resolve(session.root, 'outside-candidate-witness');
    await writeFile(witness, 'outside candidate\n', { flag: 'wx' });
    const files = {
        'browser.fixture.json': JSON.stringify(browserFixture),
        'confinement.mjs': `import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const source = ${JSON.stringify(TOOLS_ROOT)};
const require = createRequire(import.meta.url);
for (const root of [source, '/cmz-repository-0']) {
    let readable = false;
    try { readFileSync(root + '/package.json'); readable = true; } catch {}
    assert.equal(readable, false, 'Lecture atelier autorisée');
    let resolved = false;
    try { require.resolve('exceljs', { paths: [root] }); resolved = true; } catch {}
    assert.equal(resolved, false, 'Résolution atelier autorisée');
}
let writable = false;
try { writeFileSync(${JSON.stringify(witness)}, 'changed'); writable = true; } catch {}
assert.equal(writable, false, 'Écriture extérieure autorisée');
process.stdout.write('Confinement : lectures/résolution/écriture refusées.\\n');
`,
    };
    await mkdir(proof);
    for (const [path, content] of Object.entries(files)) {
        await writeFile(resolve(proof, path), content, { flag: 'wx' });
        session.lines.push(`instrumentation=${path} sha256=${hash(content)}`);
    }
    assert.equal(
        await pathExists(
            resolve(TOOLS_ROOT, 'node_modules/exceljs/package.json')
        ),
        true
    );
    record(
        session,
        'T11/real-filesystem-probes',
        confinedNode(session, product, ['.cmz/proof/confinement.mjs'])
    );
    assert.equal(await readFile(witness, 'utf8'), 'outside candidate\n');
    record(
        session,
        'T11/product-input-closure',
        confinedNode(session, product, ['.cmz/support/check-workspace.mjs'])
    );
    return { proof, files };
}

async function qualifyBrowser(session, product, plans, browser) {
    const fixturePath = resolve(product, '.cmz/proof/browser.fixture.json');
    const browserRelative = relative(browser.root, browser.executable)
        .split('\\')
        .join('/');
    for (const plan of plans) {
        const angular = plan.profile === 'angular-pwa';
        const build = () =>
            record(
                session,
                `T18/build/${plan.profile}`,
                confinedNode(
                    session,
                    product,
                    targetArguments(plan, 'build:production')
                )
            );
        const smoke = () =>
            confinedNode(
                session,
                product,
                [
                    '.cmz/support/browser-smoke.mjs',
                    resolve(
                        product,
                        'dist',
                        plan.output,
                        ...(angular ? ['browser'] : [])
                    ),
                    `{{readonly:0}}/${browserRelative}`,
                    fixturePath,
                ],
                { browser, timeoutMs: 120_000 }
            );
        build();
        record(session, `T18/browser/${plan.profile}`, smoke());
        const page = Object.keys(plan.files).find(
            (path) =>
                path.startsWith('src/app/pages/') &&
                path.endsWith(angular ? 'page.component.ts' : 'page.tsx')
        );
        await fileMutation(
            session,
            product,
            `${plan.output}/${page}`,
            (value) => value.replace('<h1', '<h1 hidden'),
            () => {
                build();
                return smoke();
            },
            /Accueil fictif/
        );
        const guard = angular
            ? 'src/app/app.routes.ts'
            : 'src/app/access-policy.tsx';
        await fileMutation(
            session,
            product,
            `${plan.output}/${guard}`,
            (value) =>
                angular
                    ? value.replace(/canActivate:\s*\[appAccessGuard\],?/g, '')
                    : value.replace(
                          'if (evaluateAppAccess(policy, decision)) return children;',
                          'if (true) return children;'
                      ),
            () => {
                build();
                return smoke();
            },
            /La garde doit refuser/
        );
    }
}

export async function qualifyWeights(session, product) {
    await assertSourceWeight(product);
    const toolCandidate = resolve(session.root, 'tool-weight-candidate');
    await mkdir(toolCandidate);
    for (const root of [toolCandidate, product]) {
        const path = resolve(root, 'untracked-weight.mts');
        assert.equal(await pathExists(path), false);
        await assertSourceWeight(root);
        let rejected = false;
        await writeFile(path, 'export {};\n'.repeat(801), { flag: 'wx' });
        try {
            await assertSourceWeight(root);
        } catch (error) {
            if (!error.message.includes('source weight')) throw error;
            rejected = true;
        } finally {
            await rm(path);
        }
        assert.equal(rejected, true, 'Le contrôle de poids accepte 801 lignes');
        await assertSourceWeight(root);
    }
    session.lines.push('PASS T14/source-and-product-untracked-801');
    await session.save();
}

export async function main(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    const session = await proofSession(options);
    const sourceBefore = await snapshotTree(TOOLS_ROOT);
    try {
        const product = resolve(session.root, 'product');
        const prepareOptions = workspaceOptions(product);
        let workspace;
        for (const profiles of [
            ['angular-pwa'],
            ['react-spa'],
            prepareOptions.profiles,
        ]) {
            const targetRoot =
                profiles.length === 2
                    ? product
                    : resolve(session.root, profiles[0]);
            workspace = await planApplicationWorkspace({
                ...prepareOptions,
                profiles,
                targetRoot,
            });
            assert.equal(
                (
                    await publishApplicationWorkspace({
                        ...prepareOptions,
                        profiles,
                        targetRoot,
                        expectedPlanId: workspace.plan_id,
                    })
                ).status,
                'prepared'
            );
            await installRealPackages(session, workspace);
        }
        const sharedPath =
            'examples/application-conception-proof/project-brief.md';
        const sharedContent = await readProductFile(TOOLS_ROOT, sharedPath);
        const input = await writeExternalDesign(product, {
            path: sharedPath,
            content: sharedContent,
        });
        session.lines.push(
            `fictitious_shared_source=${sharedPath} sha256=${hash(sharedContent)}`
        );
        const plans = [];
        const shellOptions = [];
        const run = (command, args, root) => {
            assert.equal(command, process.execPath);
            assert.equal(root, product);
            const label =
                args[1] === 'run'
                    ? args[2]
                    : args[0].endsWith('check-workspace.mjs')
                      ? 'workspace-contract'
                      : 'native-compiler';
            record(
                session,
                `T9-T12/${label}`,
                confinedNode(session, product, args)
            );
        };
        for (const profile of ['angular-pwa', 'react-spa']) {
            const shell = {
                workspaceRoot: TOOLS_ROOT,
                targetRoot: product,
                appName:
                    profile === 'angular-pwa'
                        ? 'native-angular'
                        : 'native-react',
                profile,
                designPath: input.designPath,
                experienceId: input.experienceId,
            };
            const plan = await planExternalApplicationShell(shell);
            const result = await publishExternalApplicationShell(
                { ...shell, expectedPlanId: plan.plan_id },
                { run }
            );
            assert.equal(result.recovered, false);
            plans.push(result.plan);
            shellOptions.push({ ...shell, expectedPlanId: plan.plan_id });
        }
        for (const shell of shellOptions) {
            assert.equal(
                (await publishExternalApplicationShell(shell, { run }))
                    .recovered,
                true
            );
        }
        await session.save();
        const instrumentation = await instrumentProduct(
            session,
            product,
            input.browserFixture
        );
        // Exactly the same relative source exists in the workshop. It cannot
        // rescue a missing product input while the workshop is inaccessible.
        await displacedEntry(
            session,
            product,
            sharedPath,
            () =>
                confinedNode(session, product, [
                    '.cmz/support/check-workspace.mjs',
                ]),
            /Échec du contrat workspace/
        );
        for (const plan of plans)
            await qualifyMutations(session, product, plan);
        await qualifyWeights(session, product);
        const browser = await provisionBrowser({
            policy: session.policy,
            backend: session.backend,
            cacheRoot: resolve(session.root, 'browser-cache'),
            extractionRoot: resolve(session.root, 'browser'),
        });
        session.lines.push(
            `browser=${session.policy.browser.distribution}/${session.policy.browser.version}`
        );
        await qualifyBrowser(session, product, plans, browser);
        await verifyGeneratedTree(instrumentation.proof, instrumentation.files);
        await rm(instrumentation.proof, { recursive: true });
        for (const plan of plans)
            await verifyGeneratedTree(plan.outputAbsolute, plan.files);
        assert.deepEqual(
            await snapshotTree(TOOLS_ROOT),
            sourceBefore,
            'L’atelier a changé pendant la preuve'
        );
        session.lines.push(
            'PASS real-native-shells-and-mutants',
            'T19–T28 restent non qualifiés.'
        );
        await session.save();
        process.stdout.write(
            `Preuve shells terminée : ${session.root}/report.txt\n`
        );
    } catch (error) {
        session.lines.push(formatProofStop(error));
        await session.save();
        throw error;
    }
}

if (
    process.argv[1] &&
    pathToFileURL(process.argv[1]).href === import.meta.url
) {
    main().catch(() => {
        process.stderr.write(
            'Preuve interrompue. Lire le rapport texte et analyser avant toute reprise.\n'
        );
        process.exitCode = 1;
    });
}
