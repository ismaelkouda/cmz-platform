import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
    chmodSync,
    existsSync,
    lstatSync,
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';

import semver from 'semver';

import {
    applyQualifiedAdapter,
    qualifiedAdapterDescriptor,
} from './qualified-adapters.mjs';

const COMMAND_TIMEOUT_MS = 15 * 60_000;
const MAX_BUFFER = 64 * 1024 * 1024;

function fail(message) {
    throw new Error(`add-library application: ${message}`);
}

function sha256(content) {
    return createHash('sha256').update(content).digest('hex');
}

function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((key) => [key, stable(value[key])])
        );
    }
    return value;
}

function stableJson(value) {
    return JSON.stringify(stable(value));
}

function assertIdentifier(value, label) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value ?? '')) {
        fail(`${label} exige un identifiant kebab-case`);
    }
}

function safePath(root, relativePath) {
    if (
        typeof relativePath !== 'string' ||
        relativePath === '' ||
        relativePath.startsWith('/') ||
        relativePath.split('/').some((part) => !part || part === '..')
    ) {
        fail(`chemin relatif invalide : ${relativePath}`);
    }
    const absolute = resolve(root, ...relativePath.split('/'));
    const within = relative(resolve(root), absolute);
    if (within === '..' || within.startsWith(`..${sep}`)) {
        fail(`chemin hors dépôt : ${relativePath}`);
    }
    return absolute;
}

function regularBytes(root, relativePath) {
    const absolute = safePath(root, relativePath);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile()) {
        fail(`${relativePath} n'est pas un fichier régulier`);
    }
    return readFileSync(absolute);
}

function readJson(root, relativePath) {
    try {
        return JSON.parse(regularBytes(root, relativePath).toString('utf8'));
    } catch (error) {
        fail(`${relativePath} illisible (${error.message})`);
    }
}

function command(commandName, argv, options = {}) {
    const result = spawnSync(commandName, argv, {
        cwd: options.cwd,
        encoding: options.encoding ?? 'utf8',
        input: options.input,
        timeout: options.timeout ?? COMMAND_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER,
        shell: false,
        env: options.env ?? process.env,
        stdio: options.stdio,
    });
    if (result.error) {
        fail(
            `${options.label ?? commandName} impossible (${result.error.message})`
        );
    }
    if (result.status !== 0) {
        const diagnostic = [...`${result.stderr || result.stdout || ''}`]
            .map((character) => {
                const code = character.codePointAt(0);
                return code <= 31 || code === 127 ? ' ' : character;
            })
            .join('')
            .slice(0, 4_000);
        fail(
            `${options.label ?? commandName} a échoué (code ${result.status})${diagnostic ? ` : ${diagnostic}` : ''}`
        );
    }
    return result.stdout;
}

function git(root, argv, options = {}) {
    return command(
        'git',
        [
            '-C',
            resolve(root),
            '--no-replace-objects',
            '--no-lazy-fetch',
            ...argv,
        ],
        {
            ...options,
            label: `git ${argv[0]}`,
            env: {
                PATH: process.env.PATH,
                LANG: 'C',
                LC_ALL: 'C',
                GIT_CONFIG_NOSYSTEM: '1',
                GIT_CONFIG_GLOBAL: '/dev/null',
                GIT_CONFIG_SYSTEM: '/dev/null',
                GIT_OPTIONAL_LOCKS: '0',
                GIT_TERMINAL_PROMPT: '0',
                ...options.env,
            },
        }
    );
}

function exactVersion(value, label) {
    const normalized = value?.replace(/^bun@/, '').replace(/^v/, '');
    if (!semver.valid(normalized))
        fail(`${label} n'est pas une version exacte`);
    return normalized;
}

function workspaceVersions(root, platform) {
    const manifest = readJson(root, 'package.json');
    const versions = {
        node: exactVersion(process.versions.node, 'Node'),
        bun: exactVersion(manifest.packageManager, 'Bun'),
        nx: exactVersion(manifest.devDependencies?.nx, 'Nx'),
    };
    if (platform === 'angular') {
        versions.framework = exactVersion(
            manifest.workspaces?.catalog?.['@angular/core'],
            'Angular'
        );
    } else {
        fail(`plateforme non prise en charge : ${platform}`);
    }
    return { manifest, versions };
}

function detectPlatform(root, app) {
    const project = readJson(root, `apps/${app}/project.json`);
    if (
        project.name === app &&
        project.projectType === 'application' &&
        project.targets?.build?.executor === '@angular/build:application'
    ) {
        return { platform: 'angular', project };
    }
    fail(`plateforme qualifiée indéterminée pour apps/${app}`);
}

function verifyAttestedInputs(root, verification) {
    const fixed = {
        recipe: `conventions/libraries/${verification.platform}/${verification.library}.setup.json`,
        recipe_schema: 'conventions/libraries/library-setup.schema.json',
        compat_schema: 'conventions/libraries/library-compat.schema.json',
        policy: 'conventions/libraries/resolution-policy.json',
        policy_schema: 'conventions/libraries/resolution-policy.schema.json',
        nx_json: 'nx.json',
        tsconfig: 'tsconfig.base.json',
        gitattributes: '.gitattributes',
    };
    for (const [key, path] of Object.entries(fixed)) {
        if (
            sha256(regularBytes(root, path)) !==
            verification.inputs_sha256?.[key]
        ) {
            fail(`${path} a changé depuis la qualification`);
        }
    }
    for (const [path, expected] of Object.entries(
        verification.inputs_sha256?.runner_sources ?? {}
    )) {
        if (sha256(regularBytes(root, path)) !== expected) {
            fail(`${path} a changé depuis la qualification`);
        }
    }
}

function verifyEvidence(verification) {
    const { evidence_sha256: observed, ...payload } = verification;
    if (observed !== sha256(stableJson(payload))) {
        fail("l'empreinte de l'attestation est invalide");
    }
}

function loadQualifiedConfiguration(root, app, library) {
    const { platform, project } = detectPlatform(root, app);
    const appManifest = readJson(root, `apps/${app}/.cmz/libraries.json`);
    if (
        appManifest.schema_version !== '1.0.0' ||
        appManifest.kind !== 'app-library-manifest' ||
        appManifest.platform !== platform ||
        !Array.isArray(appManifest.libraries)
    ) {
        fail(`manifeste de ${app} invalide`);
    }
    if (appManifest.libraries.includes(library)) {
        fail(`${library} est déjà installée dans ${app}`);
    }
    const matrixPath = `conventions/libraries/${platform}/${library}.compat.json`;
    const matrix = readJson(root, matrixPath);
    if (
        matrix.schema_version !== '1.0.0' ||
        matrix.platform !== platform ||
        matrix.library !== library ||
        !Array.isArray(matrix.tracks)
    ) {
        fail(`${matrixPath} invalide`);
    }
    const { manifest, versions } = workspaceVersions(root, platform);
    const matches = matrix.tracks.filter(
        (track) =>
            track.status === 'verified' &&
            Object.entries(track.requirements ?? {}).every(([key, range]) =>
                semver.satisfies(versions[key], range, {
                    includePrerelease: false,
                })
            )
    );
    if (matches.length !== 1) {
        fail(
            `${platform}/${library}: ${matches.length} piste verified compatible`
        );
    }
    const track = matches[0];
    const verification = track.verification;
    if (verification?.schema_version !== '1.3.0') {
        fail(`${track.id}: qualification sans adaptateur 1.3.0`);
    }
    verifyEvidence(verification);
    for (const [key, version] of Object.entries(versions)) {
        if (verification.tested_versions?.[key] !== version) {
            fail(`${key} ${version} différent de la qualification`);
        }
    }
    if (
        stableJson(verification.tested_versions?.packages) !==
        stableJson(track.packages)
    ) {
        fail('paquets testés différents de la piste');
    }
    const descriptor = qualifiedAdapterDescriptor(root, platform, library);
    const { change_set_id: adapterChangeSetId, ...verifiedDescriptor } =
        verification.qualified_adapter ?? {};
    if (
        !/^changes:[a-f0-9]{64}$/.test(adapterChangeSetId ?? '') ||
        stableJson(verifiedDescriptor) !== stableJson(descriptor)
    ) {
        fail("l'adaptateur courant diffère de l'adaptateur qualifié");
    }
    const qualified = { ...verification, platform, library };
    verifyAttestedInputs(root, qualified);
    const catalog =
        track.catalog === 'default'
            ? manifest.workspaces?.catalog
            : manifest.workspaces?.catalogs?.tooling;
    for (const [name, version] of Object.entries(track.packages).sort()) {
        if (
            catalog?.[name] !== version ||
            manifest[track.dependency_section]?.[name] !== 'catalog:'
        ) {
            fail(`${name}@${version} n'est pas provisionné à la racine`);
        }
        const installed = readJson(root, `node_modules/${name}/package.json`);
        if (installed.name !== name || installed.version !== version) {
            fail(`${name}@${version} n'est pas installé à la racine`);
        }
    }
    return { descriptor, matrixPath, platform, project, track, versions };
}

function assertPublishable(root) {
    const status = git(root, [
        'status',
        '--porcelain=v1',
        '-z',
        '--untracked-files=all',
    ]);
    if (status !== '') fail('dépôt entièrement propre requis');
    const branch = git(root, ['symbolic-ref', '-q', 'HEAD']).trim();
    if (!branch.startsWith('refs/heads/'))
        fail('branche locale attachée requise');
    for (const path of [
        '.git/cmz-library.lock',
        '.git/cmz-library-transaction.json',
    ]) {
        if (existsSync(join(root, path))) {
            fail(`ancienne transaction présente (${path})`);
        }
    }
    return {
        branch,
        head: git(root, ['rev-parse', '--verify', 'HEAD']).trim(),
    };
}

function createCandidate(root, head) {
    const parent = mkdtempSync(
        join(realpathSync(tmpdir()), 'cmz-library-apply-')
    );
    chmodSync(parent, 0o700);
    const workspace = join(parent, 'workspace');
    try {
        git(root, [
            '-c',
            'core.hooksPath=/dev/null',
            'worktree',
            'add',
            '--quiet',
            '--detach',
            workspace,
            head,
        ]);
    } catch (error) {
        rmSync(parent, { recursive: true, force: true });
        throw error;
    }
    return { parent, workspace };
}

function releaseCandidate(root, candidate) {
    let failure;
    if (existsSync(candidate.workspace)) {
        try {
            git(root, ['worktree', 'remove', '--force', candidate.workspace]);
        } catch (error) {
            failure = error;
        }
    }
    try {
        rmSync(candidate.parent, { recursive: true, force: true });
    } catch (error) {
        failure ??= error;
    }
    if (failure) throw failure;
}

function installWithoutScripts(workspace) {
    const policy = readJson(
        workspace,
        'conventions/libraries/resolution-policy.json'
    );
    const registry = policy.allowed_registries?.[0];
    if (typeof registry !== 'string' || !registry.startsWith('https://')) {
        fail('registre HTTPS qualifié absent');
    }
    const bun = realpathSync(
        execFileSync('which', ['bun'], { encoding: 'utf8' }).trim()
    );
    const home = mkdtempSync(join(realpathSync(tmpdir()), 'cmz-library-home-'));
    chmodSync(home, 0o700);
    try {
        command(
            bun,
            [
                'install',
                '--frozen-lockfile',
                '--ignore-scripts',
                '--backend=copyfile',
                `--registry=${registry}`,
            ],
            {
                cwd: workspace,
                label: 'bun install gelé sans scripts',
                env: {
                    PATH: process.env.PATH,
                    HOME: home,
                    LANG: 'C',
                    LC_ALL: 'C',
                    BUN_INSTALL_CACHE_DIR: join(
                        realpathSync(tmpdir()),
                        'cmz-library-bun-cache-v1'
                    ),
                    GIT_CONFIG_NOSYSTEM: '1',
                    GIT_CONFIG_GLOBAL: '/dev/null',
                    GIT_CONFIG_SYSTEM: '/dev/null',
                    GIT_TERMINAL_PROMPT: '0',
                },
                stdio: ['ignore', 'pipe', 'pipe'],
            }
        );
    } finally {
        rmSync(home, { recursive: true, force: true });
    }
}

function runTargetedChecks(workspace, app, project) {
    const prettier = safePath(
        workspace,
        'node_modules/prettier/bin/prettier.cjs'
    );
    const nx = safePath(workspace, 'node_modules/nx/dist/bin/nx.js');
    command(process.execPath, [prettier, '--write', `apps/${app}`], {
        cwd: workspace,
        label: `format ${app}`,
    });
    const checks = ['build', 'lint', 'test'].filter(
        (target) => project.targets?.[target]
    );
    if (!checks.includes('build')) fail(`${app}: target build obligatoire`);
    for (const target of checks) {
        command(process.execPath, [nx, 'run', `${app}:${target}`], {
            cwd: workspace,
            label: `${app}:${target}`,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    }
    return checks;
}

function changeSet(root, candidate, baseCommit, app) {
    const output = git(candidate, [
        'diff',
        '--name-status',
        '-z',
        baseCommit,
        '--',
        `apps/${app}`,
    ]);
    const fields = output.split('\0').filter(Boolean);
    if (fields.length % 2 !== 0) fail('diff Git applicatif illisible');
    const changes = [];
    for (let index = 0; index < fields.length; index += 2) {
        const op = fields[index];
        const path = fields[index + 1];
        if (!['A', 'M'].includes(op) || !path.startsWith(`apps/${app}/`)) {
            fail(`mutation non prise en charge : ${op} ${path}`);
        }
        const content = regularBytes(candidate, path);
        const mode =
            lstatSync(safePath(candidate, path)).mode & 0o111
                ? '100755'
                : '100644';
        const entry = {
            op: op === 'A' ? 'create' : 'modify',
            path,
            mode,
            sha256_after: sha256(content),
        };
        if (op === 'M') {
            entry.sha256_before = sha256(
                git(root, ['show', `${baseCommit}:${path}`], {
                    encoding: 'buffer',
                })
            );
        }
        changes.push(entry);
    }
    if (changes.length === 0) fail("l'adaptateur n'a produit aucun changement");
    changes.sort((left, right) => left.path.localeCompare(right.path));
    const payload = { schema_version: '1.0.0', changes };
    return {
        ...payload,
        change_set_id: `changes:${sha256(stableJson(payload))}`,
    };
}

function applicationPlan({
    app,
    library,
    baseCommit,
    configuration,
    changes,
    checks,
}) {
    const payload = {
        schema_version: '2.0.0',
        kind: 'qualified-library-application',
        app,
        library,
        platform: configuration.platform,
        base_commit: baseCommit,
        track_id: configuration.track.id,
        adapter_sha256: configuration.descriptor.digest_sha256,
        change_set_id: changes.change_set_id,
        checks,
    };
    return {
        ...payload,
        plan_id: `library-plan:${sha256(stableJson(payload))}`,
    };
}

function createCommit(root, candidate, baseCommit, app, message) {
    git(candidate, ['add', '--', `apps/${app}`]);
    const tree = git(candidate, ['write-tree']).trim();
    const commit = git(root, [
        'commit-tree',
        tree,
        '-p',
        baseCommit,
        '-m',
        message,
    ]).trim();
    if (!/^[a-f0-9]{40,64}$/.test(commit)) fail('commit candidat invalide');
    return commit;
}

function publishFastForward(root, baseCommit, candidateCommit) {
    const current = assertPublishable(root);
    if (current.head !== baseCommit)
        fail('HEAD a changé pendant les validations');
    git(root, [
        '-c',
        'core.hooksPath=/dev/null',
        'merge',
        '--ff-only',
        '--no-edit',
        candidateCommit,
    ]);
    const head = git(root, ['rev-parse', '--verify', 'HEAD']).trim();
    if (head !== candidateCommit) fail('fast-forward non publié');
    if (
        git(root, [
            'status',
            '--porcelain=v1',
            '-z',
            '--untracked-files=all',
        ]) !== ''
    ) {
        fail('publication achevée mais worktree non propre');
    }
    return { commit: candidateCommit, branch: current.branch };
}

/**
 * Voie courante : aucun import du moteur de qualification, aucun schematic,
 * sandbox, navigateur ou oracle de promotion. Git confine toutes les écritures
 * dans un worktree jetable jusqu'au fast-forward final.
 */
export async function applyQualifiedLibrary({
    repository,
    app,
    library,
    dryRun = false,
    expectPlan,
    onProgress = () => undefined,
}) {
    assertIdentifier(app, 'app');
    assertIdentifier(library, 'library');
    if (typeof onProgress !== 'function')
        fail('onProgress doit être une fonction');
    const root = resolve(repository);
    const startedAt = Date.now();
    const total = dryRun ? 7 : 8;
    onProgress({ step: 1, total, id: 'preconditions' });
    const { head } = assertPublishable(root);
    onProgress({ step: 2, total, id: 'qualified-track' });
    const configuration = loadQualifiedConfiguration(root, app, library);
    let candidate;
    let primaryError;
    let result;
    try {
        onProgress({ step: 3, total, id: 'candidate' });
        candidate = createCandidate(root, head);
        onProgress({ step: 4, total, id: 'adapter' });
        applyQualifiedAdapter({
            workspace: candidate.workspace,
            app,
            platform: configuration.platform,
            library,
            track: configuration.track,
        });
        onProgress({ step: 5, total, id: 'install-without-scripts' });
        installWithoutScripts(candidate.workspace);
        onProgress({ step: 6, total, id: 'targeted-checks' });
        const checks = runTargetedChecks(
            candidate.workspace,
            app,
            configuration.project
        );
        const changes = changeSet(root, candidate.workspace, head, app);
        onProgress({ step: 7, total, id: 'plan' });
        const plan = applicationPlan({
            app,
            library,
            baseCommit: head,
            configuration,
            changes,
            checks,
        });
        if (expectPlan && expectPlan !== plan.plan_id) {
            fail(`plan attendu ${expectPlan}, obtenu ${plan.plan_id}`);
        }
        if (dryRun) {
            result = {
                plan,
                changeSet: changes,
                checks,
                duration_ms: Date.now() - startedAt,
                published: false,
            };
        } else {
            onProgress({ step: 8, total, id: 'publication' });
            const commit = createCommit(
                root,
                candidate.workspace,
                head,
                app,
                `chore(${app}): add ${library}`
            );
            const publication = publishFastForward(root, head, commit);
            result = {
                plan,
                changeSet: changes,
                checks,
                duration_ms: Date.now() - startedAt,
                publication,
                published: true,
            };
        }
    } catch (error) {
        primaryError = error;
    } finally {
        if (candidate) {
            try {
                releaseCandidate(root, candidate);
            } catch (error) {
                if (primaryError) primaryError.cleanupError = error;
                else primaryError = error;
            }
        }
    }
    if (primaryError) throw primaryError;
    return result;
}

export const libraryApplicationInternals = {
    applicationPlan,
    loadQualifiedConfiguration,
    stableJson,
};
