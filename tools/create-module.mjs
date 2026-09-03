#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
    closeSync,
    existsSync,
    fsyncSync,
    lstatSync,
    mkdtempSync,
    mkdirSync,
    openSync,
    readFileSync,
    renameSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

import {
    applyConfigAddition,
    captureConfigOriginals,
    computeConfigAddition,
    configOriginalsSha256,
    restoreConfigOriginals,
} from './retire-module-config.mjs';
import {
    currentGitIdentity,
    withTransactionLock,
} from './retire-module-transaction.mjs';
import { runNxGraphGate } from './retire-module-nx.mjs';
import {
    createRetirementPlan,
    retirementPlanSha256,
} from './retire-module-plan.mjs';
import {
    compositionSha256,
    loadCompositionRegistry,
} from './generator-platform/core/composition-registry.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const TRANSACTION_ROOT = '.cmz/create-module-transactions';
const CONFIG_FILES = [
    'eslint.config.mjs',
    'tsconfig.base.json',
    'knip.json',
    'package.json',
    'bun.lock',
];

const COMPOSITION_KINDS = loadCompositionRegistry(ROOT).byKind;

function expectedLayeredProjects(moduleName, composition) {
    return composition.layers
        .map((layer) => ({
            name: `@cmz/${moduleName}-${layer}`,
            projectJson: `libs/${moduleName}/angular-${layer}/project.json`,
            root: `libs/${moduleName}/angular-${layer}`,
        }))
        .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

function fail(message) {
    throw new Error(message);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function entryExists(path) {
    try {
        lstatSync(path);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

function gitVisibleTreeSha256(relativeRoot) {
    let inventory;
    try {
        inventory = execFileSync(
            'git',
            [
                'ls-files',
                '-z',
                '--cached',
                '--others',
                '--exclude-standard',
                '--',
                relativeRoot,
            ],
            { cwd: ROOT, encoding: 'utf8' }
        );
    } catch {
        fail(`Inventaire Git illisible pour ${relativeRoot}.`);
    }
    const paths = inventory.split('\0').filter(Boolean).sort();
    if (paths.length === 0) fail(`Inventaire Git vide pour ${relativeRoot}.`);
    const hash = createHash('sha256');
    for (const path of paths) {
        const absolute = join(ROOT, path);
        const metadata = lstatSync(absolute);
        if (!metadata.isFile() || metadata.isSymbolicLink())
            fail(
                `Artefact généré non régulier dans l'inventaire Git : ${path}.`
            );
        hash.update(`F\0${path}\0${metadata.mode & 0o777}\0${metadata.size}\0`);
        hash.update(readFileSync(absolute));
        hash.update('\0');
    }
    return hash.digest('hex');
}

function parseArgs(argv) {
    const options = { abort: false, dryRun: false, resume: false };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === '--definition') options.definition = argv[++index];
        else if (argument === '--module') options.module = argv[++index];
        else if (argument === '--dry-run') options.dryRun = true;
        else if (argument === '--resume') options.resume = true;
        else if (argument === '--abort') options.abort = true;
        else fail(`Argument inconnu : ${argument}`);
    }
    if (options.resume || options.abort) {
        if (!options.module || !/^[a-z][a-z0-9-]*$/.test(options.module))
            fail('--resume/--abort exige --module <kebab-case>.');
        if (
            options.definition ||
            options.dryRun ||
            (options.resume && options.abort)
        )
            fail(
                '--resume et --abort sont exclusifs de --definition/--dry-run.'
            );
    } else if (!options.definition) {
        fail('--definition <fichier.json> est requis.');
    }
    return options;
}

function readDefinition(path) {
    const absolute = resolve(path);
    const metadata = lstatSync(absolute);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        fail('La définition doit être un fichier régulier, jamais un lien.');
    const content = readFileSync(absolute);
    let document;
    try {
        document = JSON.parse(content.toString('utf8'));
    } catch (error) {
        fail(`Définition JSON invalide : ${error.message}`);
    }
    const moduleName = document?.feature?.id;
    if (!/^[a-z][a-z0-9-]*$/.test(moduleName ?? ''))
        fail('definition.feature.id doit être un identifiant kebab-case.');
    if (document?.domain !== undefined && document.domain?.id !== moduleName)
        fail(
            'definition.domain.id doit être identique à definition.feature.id.'
        );
    const kind = document?.kind;
    if (!Object.hasOwn(COMPOSITION_KINDS, kind ?? ''))
        fail(
            `definition.kind "${kind}" non reconnu — attendu l'un de : ` +
                `${Object.keys(COMPOSITION_KINDS).join(', ')}.`
        );
    return { absolute, content, moduleName, kind };
}

function stateDir(moduleName) {
    return join(ROOT, TRANSACTION_ROOT, moduleName);
}

function statePath(moduleName) {
    return join(stateDir(moduleName), 'state.json');
}

function assertCreateStorage(moduleName) {
    let topLevel;
    try {
        topLevel = execFileSync('git', ['rev-parse', '--show-toplevel'], {
            cwd: ROOT,
            encoding: 'utf8',
        }).trim();
        execFileSync(
            'git',
            ['check-ignore', '--quiet', `${TRANSACTION_ROOT}/.gitignore-probe`],
            { cwd: ROOT, stdio: 'ignore' }
        );
    } catch {
        fail(`${TRANSACTION_ROOT}/ doit être explicitement ignoré par Git.`);
    }
    if (resolve(topLevel) !== resolve(ROOT))
        fail('La racine Git ne correspond pas au workspace de création.');
    for (const path of [
        join(ROOT, '.cmz'),
        join(ROOT, TRANSACTION_ROOT),
        stateDir(moduleName),
    ]) {
        if (!entryExists(path)) continue;
        const metadata = lstatSync(path);
        if (!metadata.isDirectory() || metadata.isSymbolicLink())
            fail(`${relative(ROOT, path)} doit être un dossier réel.`);
    }
}

function syncDirectory(path) {
    const descriptor = openSync(path, 'r');
    try {
        fsyncSync(descriptor);
    } finally {
        closeSync(descriptor);
    }
}

function writeState(moduleName, state) {
    const directory = stateDir(moduleName);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const temporary = join(directory, `.state-${process.pid}-${randomUUID()}`);
    let descriptor;
    try {
        descriptor = openSync(temporary, 'wx', 0o600);
        writeFileSync(descriptor, `${JSON.stringify(state, null, 2)}\n`);
        fsyncSync(descriptor);
        closeSync(descriptor);
        descriptor = undefined;
        renameSync(temporary, statePath(moduleName));
        syncDirectory(directory);
    } catch (error) {
        if (descriptor !== undefined) closeSync(descriptor);
        rmSync(temporary, { force: true });
        throw error;
    }
}

function readState(moduleName) {
    const path = statePath(moduleName);
    if (!existsSync(path)) return null;
    const metadata = lstatSync(path);
    if (!metadata.isFile() || metadata.isSymbolicLink())
        fail(`Journal de création non régulier : ${relative(ROOT, path)}.`);
    try {
        return JSON.parse(readFileSync(path, 'utf8'));
    } catch (error) {
        fail(`Journal de création illisible : ${error.message}`);
    }
}

function removeState(moduleName) {
    const directory = stateDir(moduleName);
    if (!entryExists(directory)) return;
    const metadata = lstatSync(directory);
    if (!metadata.isDirectory() || metadata.isSymbolicLink())
        fail(
            `Journal de création non régulier : ${relative(ROOT, directory)}.`
        );
    rmSync(directory, { recursive: true, force: true });
    syncDirectory(dirname(directory));
}

function exactKeys(value, keys) {
    return (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
    );
}

function validateState(
    moduleName,
    state,
    { allowGitDrift = false, allowCompositionDrift = false } = {}
) {
    const keys = [
        'version',
        'module',
        'kind',
        'composition',
        'compositionSha256',
        'status',
        'startedAt',
        'workspaceRoot',
        'gitHead',
        'gitBranch',
        'definitionPath',
        'definitionBase64',
        'definitionSha256',
        'outputRoot',
        'configOriginals',
        'configOriginalSha256',
        'desiredConfigs',
        'desiredConfigSha256',
        'plan',
        'planSha256',
        'generatedTreeSha256',
    ];
    if (
        !exactKeys(state, keys) ||
        state.version !== 5 ||
        state.module !== moduleName ||
        !Object.hasOwn(COMPOSITION_KINDS, state.kind ?? '') ||
        !exactKeys(state.composition, [
            'kind',
            'maturity',
            'maturityNote',
            'target',
            'generatorScript',
            'layers',
            'evidence',
        ]) ||
        state.composition.kind !== state.kind ||
        compositionSha256(state.composition) !== state.compositionSha256 ||
        (!allowCompositionDrift &&
            state.compositionSha256 !==
                compositionSha256(COMPOSITION_KINDS[state.kind])) ||
        !['planned', 'generated', 'configured'].includes(state.status) ||
        typeof state.startedAt !== 'string' ||
        Number.isNaN(Date.parse(state.startedAt)) ||
        resolve(state.workspaceRoot || '') !== resolve(ROOT) ||
        typeof state.definitionPath !== 'string' ||
        resolve(state.definitionPath) !== state.definitionPath ||
        typeof state.definitionBase64 !== 'string' ||
        sha256(Buffer.from(state.definitionBase64, 'base64')) !==
            state.definitionSha256 ||
        !(state.gitHead === null || typeof state.gitHead === 'string') ||
        !(state.gitBranch === null || typeof state.gitBranch === 'string') ||
        state.outputRoot !== `libs/${moduleName}` ||
        !/^[a-f0-9]{64}$/.test(state.definitionSha256 ?? '') ||
        !exactKeys(state.configOriginals, CONFIG_FILES) ||
        !exactKeys(state.configOriginalSha256, CONFIG_FILES) ||
        Object.entries(state.configOriginals).some(
            ([file, base64]) =>
                typeof base64 !== 'string' ||
                sha256(Buffer.from(base64, 'base64')) !==
                    state.configOriginalSha256[file]
        )
    )
        fail(`Journal de création invalide pour "${moduleName}".`);
    const hasGeneratedMetadata = state.status !== 'planned';
    if (
        hasGeneratedMetadata !== (state.plan !== null) ||
        hasGeneratedMetadata !== (state.planSha256 !== null) ||
        hasGeneratedMetadata !== (state.generatedTreeSha256 !== null) ||
        hasGeneratedMetadata !== (state.desiredConfigs !== null) ||
        hasGeneratedMetadata !== (state.desiredConfigSha256 !== null)
    )
        fail(`Journal de création incomplet pour "${moduleName}".`);
    if (hasGeneratedMetadata) {
        const expectedProjects = expectedLayeredProjects(
            moduleName,
            state.composition
        );
        if (
            retirementPlanSha256(state.plan) !== state.planSha256 ||
            state.plan.module !== moduleName ||
            state.plan.scopeTag !== `scope:${moduleName}` ||
            JSON.stringify(state.plan.roots) !==
                JSON.stringify([state.outputRoot]) ||
            JSON.stringify(state.plan.projects) !==
                JSON.stringify(expectedProjects) ||
            !/^[a-f0-9]{64}$/.test(state.generatedTreeSha256) ||
            !exactKeys(state.desiredConfigs, [
                'eslint.config.mjs',
                'tsconfig.base.json',
            ]) ||
            !exactKeys(state.desiredConfigSha256, [
                'eslint.config.mjs',
                'tsconfig.base.json',
            ]) ||
            Object.entries(state.desiredConfigs).some(
                ([file, base64]) =>
                    typeof base64 !== 'string' ||
                    sha256(Buffer.from(base64, 'base64')) !==
                        state.desiredConfigSha256[file]
            )
        )
            fail(`Métadonnées générées invalides pour "${moduleName}".`);
    }
    if (!allowGitDrift) {
        const git = currentGitIdentity(ROOT);
        if (git.head !== state.gitHead || git.branch !== state.gitBranch)
            fail('HEAD ou branche a changé depuis le début de la création.');
    }
    return state;
}

function originalText(state, file) {
    return Buffer.from(state.configOriginals[file], 'base64').toString('utf8');
}

function desiredText(state, file) {
    return Buffer.from(state.desiredConfigs[file], 'base64').toString('utf8');
}

function validateGeneratedRoot(moduleName, composition, expectedHash) {
    const output = join(ROOT, 'libs', moduleName);
    const metadata = lstatSync(output);
    if (!metadata.isDirectory() || metadata.isSymbolicLink())
        fail(
            `La sortie ${relative(ROOT, output)} n'est pas un dossier régulier.`
        );
    for (const file of [
        'artifact-plan.json',
        'evidence-model.json',
        'semantic-model.json',
        ...composition.layers.map(
            (layer) => `angular-${layer}/generation-manifest.json`
        ),
    ]) {
        const path = join(output, file);
        const item = lstatSync(path);
        if (!item.isFile() || item.isSymbolicLink())
            fail(
                `Preuve de propriété générée absente/non régulière : ${file}.`
            );
    }
    const { plan, sha256: planSha256 } = createRetirementPlan(ROOT, moduleName);
    const expectedProjects = expectedLayeredProjects(
        moduleName,
        composition
    ).map(({ name }) => name);
    if (
        JSON.stringify(plan.roots) !== JSON.stringify([`libs/${moduleName}`]) ||
        JSON.stringify(plan.projects.map(({ name }) => name).sort()) !==
            JSON.stringify(expectedProjects)
    )
        fail(
            'La sortie générée ne correspond pas au module Nx canonique attendu.'
        );
    const generatedTreeSha256 = gitVisibleTreeSha256(`libs/${moduleName}`);
    if (expectedHash && generatedTreeSha256 !== expectedHash)
        fail('La sortie générée a dérivé depuis sa journalisation.');
    return { plan, planSha256, generatedTreeSha256 };
}

function computeDesiredState(state, generated) {
    const desired = computeConfigAddition(
        {
            'eslint.config.mjs': originalText(state, 'eslint.config.mjs'),
            'tsconfig.base.json': originalText(state, 'tsconfig.base.json'),
        },
        state.module,
        generated.plan
    );
    return {
        ...state,
        status: 'generated',
        ...generated,
        desiredConfigs: Object.fromEntries(
            Object.entries(desired).map(([file, content]) => [
                file,
                Buffer.from(content).toString('base64'),
            ])
        ),
        desiredConfigSha256: Object.fromEntries(
            Object.entries(desired).map(([file, content]) => [
                file,
                sha256(content),
            ])
        ),
    };
}

function validateConfigForResume(state) {
    for (const file of CONFIG_FILES) {
        const path = join(ROOT, file);
        const metadata = lstatSync(path);
        if (!metadata.isFile() || metadata.isSymbolicLink())
            fail(`${file} n'est plus un fichier régulier.`);
        if (file === 'bun.lock') continue;
        const current = sha256(readFileSync(path));
        const allowed = new Set([state.configOriginalSha256[file]]);
        if (state.desiredConfigSha256?.[file])
            allowed.add(state.desiredConfigSha256[file]);
        if (!allowed.has(current))
            fail(`${file} a été modifié hors de la transaction de création.`);
    }
}

function run(command, args) {
    const env = { ...process.env };
    if (!env.NX_CLOUD_ACCESS_TOKEN) env.NX_NO_CLOUD = 'true';
    try {
        return execFileSync(command, args, {
            cwd: ROOT,
            encoding: 'utf8',
            env,
        });
    } catch (error) {
        const detail = `${error.stdout || ''}${error.stderr || ''}`.trim();
        fail(
            `${command} ${args.join(' ')} a échoué` +
                `${detail ? ` :\n${detail}` : ` (${error.message})`}`
        );
    }
}

function materializeDefinitionSnapshot(state) {
    const path = join(stateDir(state.module), 'definition.snapshot.json');
    const expected = Buffer.from(state.definitionBase64, 'base64');
    if (entryExists(path)) {
        const metadata = lstatSync(path);
        if (
            !metadata.isFile() ||
            metadata.isSymbolicLink() ||
            sha256(readFileSync(path)) !== state.definitionSha256
        )
            fail('Le snapshot immuable de la définition a dérivé.');
        return path;
    }
    const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`;
    let descriptor;
    try {
        descriptor = openSync(temporary, 'wx', 0o600);
        writeFileSync(descriptor, expected);
        fsyncSync(descriptor);
        closeSync(descriptor);
        descriptor = undefined;
        renameSync(temporary, path);
        syncDirectory(dirname(path));
        return path;
    } finally {
        if (descriptor !== undefined) closeSync(descriptor);
        rmSync(temporary, { force: true });
    }
}

function runGenerator(state, dryRun = false) {
    const composition = state.composition;
    let temporaryRoot;
    let definitionPath;
    if (dryRun) {
        temporaryRoot = mkdtempSync(join(tmpdir(), 'cmz-create-definition-'));
        definitionPath = join(temporaryRoot, 'definition.snapshot.json');
        writeFileSync(
            definitionPath,
            Buffer.from(state.definitionBase64, 'base64'),
            { flag: 'wx', mode: 0o600 }
        );
    } else {
        definitionPath = materializeDefinitionSnapshot(state);
    }
    const args = [
        join(ROOT, composition.generatorScript),
        '--definition',
        definitionPath,
        '--out',
        join(ROOT, state.outputRoot),
        '--target',
        composition.target,
    ];
    if (dryRun) args.push('--dry-run');
    try {
        return run(process.execPath, args);
    } finally {
        if (temporaryRoot)
            rmSync(temporaryRoot, { recursive: true, force: true });
    }
}

function runCreationGates(state) {
    run('bun', ['install']);
    for (const script of [
        'check-project-names.mjs',
        'check-project-targets.mjs',
        'check-declared-deps.mjs',
    ])
        run(process.execPath, [join(ROOT, 'tools', script)]);
    for (const project of state.plan.projects)
        run('bunx', ['nx', 'run', `${project.name}:build`]);
    run('bunx', [
        'nx',
        'run-many',
        '--target=lint',
        `--projects=${state.plan.projects.map(({ name }) => name).join(',')}`,
        '--parallel=3',
    ]);
    const nx = runNxGraphGate(ROOT, 'post-création');
    if (!nx.ok) fail(nx.output);
    console.log(nx.output);
    run('bunx', ['prettier', '--check', state.outputRoot]);
    run('bun', ['install', '--frozen-lockfile']);
}

function removeOwnedOutput(state) {
    const output = join(ROOT, state.outputRoot);
    const discarded = join(stateDir(state.module), 'discarded-output');
    if (entryExists(output) && entryExists(discarded))
        fail(
            `Rollback ambigu : ${state.outputRoot} et sa sortie écartée existent simultanément.`
        );
    if (!entryExists(output)) return;
    validateGeneratedRoot(
        state.module,
        state.composition,
        state.generatedTreeSha256
    );
    renameSync(output, discarded);
    syncDirectory(dirname(output));
    syncDirectory(dirname(discarded));
}

function validateFinalConfigs(state) {
    for (const file of CONFIG_FILES) {
        const path = join(ROOT, file);
        const metadata = lstatSync(path);
        if (!metadata.isFile() || metadata.isSymbolicLink())
            fail(`${file} n'est plus un fichier régulier.`);
        if (file === 'bun.lock') continue;
        const expected = state.desiredConfigSha256?.[file]
            ? state.desiredConfigSha256[file]
            : state.configOriginalSha256[file];
        if (sha256(readFileSync(path)) !== expected)
            fail(`${file} a dérivé pendant les gates de création.`);
    }
}

function rollback(state, reason, abort = false) {
    try {
        validateConfigForResume(state);
        restoreConfigOriginals(
            ROOT,
            state.configOriginals,
            state.configOriginalSha256
        );
        removeOwnedOutput(state);
        removeState(state.module);
    } catch (rollbackError) {
        fail(
            `${reason} Rollback incomplet : ${rollbackError.message}. ` +
                `Journal conservé sous ${TRANSACTION_ROOT}/${state.module}.`
        );
    }
    if (abort) {
        console.log(`✅  ${reason} Workspace restauré.`);
        return;
    }
    fail(`${reason} Workspace restauré automatiquement.`);
}

function continueCreate(initialState) {
    let state = initialState;
    try {
        if (state.status === 'planned') {
            const output = join(ROOT, state.outputRoot);
            if (!existsSync(output)) {
                process.stdout.write(runGenerator(state));
            }
            state = computeDesiredState(
                state,
                validateGeneratedRoot(state.module, state.composition, null)
            );
            writeState(state.module, state);
        }
        validateGeneratedRoot(
            state.module,
            state.composition,
            state.generatedTreeSha256
        );
        validateConfigForResume(state);
        if (state.status === 'generated') {
            restoreConfigOriginals(
                ROOT,
                state.configOriginals,
                state.configOriginalSha256
            );
            applyConfigAddition(ROOT, state.module, state.plan);
            state = { ...state, status: 'configured' };
            writeState(state.module, state);
        }
        for (const file of ['eslint.config.mjs', 'tsconfig.base.json']) {
            if (
                readFileSync(join(ROOT, file), 'utf8') !==
                desiredText(state, file)
            )
                fail(`${file} ne correspond pas au câblage journalisé.`);
        }
        runCreationGates(state);
        validateFinalConfigs(state);
        removeState(state.module);
        console.log(`✅  Module ${state.module} créé, câblé et vérifié.`);
    } catch (error) {
        rollback(state, `Création échouée : ${error.message}.`);
    }
}

function runInitial(options, definition) {
    const outputRoot = `libs/${definition.moduleName}`;
    if (
        entryExists(
            join(
                ROOT,
                'docs/architecture/removed-modules',
                `${definition.moduleName}.json`
            )
        )
    )
        fail(
            `Le module ${definition.moduleName} possède un tombstone de retrait ; ` +
                `sa recréation exige une décision d'architecture explicite.`
        );
    if (
        entryExists(
            join(ROOT, '.cmz/retire-module-transactions', definition.moduleName)
        )
    )
        fail(`Un retrait de ${definition.moduleName} est encore en cours.`);
    if (entryExists(join(ROOT, outputRoot)))
        fail(`${outputRoot} existe déjà ; aucun écrasement n'est autorisé.`);
    if (entryExists(stateDir(definition.moduleName)))
        fail(`Une création de ${definition.moduleName} est déjà en cours.`);
    const git = currentGitIdentity(ROOT);
    const originals = captureConfigOriginals(ROOT);
    const state = {
        version: 5,
        module: definition.moduleName,
        kind: definition.kind,
        composition: COMPOSITION_KINDS[definition.kind],
        compositionSha256: compositionSha256(
            COMPOSITION_KINDS[definition.kind]
        ),
        status: 'planned',
        startedAt: new Date().toISOString(),
        workspaceRoot: resolve(ROOT),
        gitHead: git.head,
        gitBranch: git.branch,
        definitionPath: definition.absolute,
        definitionBase64: definition.content.toString('base64'),
        definitionSha256: sha256(definition.content),
        outputRoot,
        configOriginals: originals,
        configOriginalSha256: configOriginalsSha256(originals),
        desiredConfigs: null,
        desiredConfigSha256: null,
        plan: null,
        planSha256: null,
        generatedTreeSha256: null,
    };
    if (options.dryRun) {
        process.stdout.write(runGenerator(state, true));
        return;
    }
    writeState(state.module, state);
    continueCreate(state);
}

function runResume(moduleName) {
    const state = readState(moduleName);
    if (!state) fail(`Aucune création à reprendre pour ${moduleName}.`);
    continueCreate(validateState(moduleName, state));
}

function runAbort(moduleName) {
    const state = readState(moduleName);
    if (!state) fail(`Aucune création à abandonner pour ${moduleName}.`);
    rollback(
        validateState(moduleName, state, {
            allowGitDrift: true,
            allowCompositionDrift: true,
        }),
        'Création abandonnée.',
        true
    );
}

function main() {
    const options = parseArgs(process.argv.slice(2));
    const definition = options.module
        ? null
        : readDefinition(options.definition);
    const moduleName = options.module ?? definition.moduleName;
    if (options.dryRun) {
        assertCreateStorage(moduleName);
        runInitial(options, definition);
        return;
    }
    withTransactionLock(ROOT, { module: moduleName, command: 'create' }, () => {
        assertCreateStorage(moduleName);
        if (options.resume) runResume(moduleName);
        else if (options.abort) runAbort(moduleName);
        else runInitial(options, definition);
    });
}

try {
    main();
} catch (error) {
    console.error(`❌  ${error.message}`);
    process.exitCode = 1;
}
