import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { parseWithoutDuplicateKeys } from '../check-library-setup-deps.mjs';
import { buildLibraryChangeSet } from './library-plan.mjs';
import { replaceRegularFile } from './dependency-resolution.mjs';
import { snapshotFilesystem } from './filesystem-snapshot.mjs';
import { runConfined } from './sandbox.mjs';

function fail(message) {
    throw new Error(`library recipe execution: ${message}`);
}

function regularFile(workspace, path) {
    const absolute = join(workspace, path);
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile())
        fail(`${path} n'est pas un fichier régulier`);
    return absolute;
}

function regularAppFile(workspace, appRoot, relativePath) {
    const segments = `${appRoot}/${relativePath}`.split('/');
    let current = workspace;
    for (const [index, segment] of segments.entries()) {
        current = join(current, segment);
        const stats = lstatSync(current);
        if (stats.isSymbolicLink()) {
            fail(`${appRoot}/${relativePath}: ancêtre ou cible symbolique`);
        }
        if (index < segments.length - 1 && !stats.isDirectory()) {
            fail(`${appRoot}/${relativePath}: ancêtre non répertoire`);
        }
        if (index === segments.length - 1 && !stats.isFile()) {
            fail(`${appRoot}/${relativePath}: cible non régulière`);
        }
    }
    return current;
}

function validateRecipeChanges(changeSet, appRoot, allowDependencies) {
    for (const change of changeSet.changes) {
        const dependencyRewrite = DEPENDENCY_ARTEFACTS.includes(change.path);
        if (
            dependencyRewrite &&
            allowDependencies &&
            change.op === 'modify' &&
            change.mode === '100644'
        ) {
            continue;
        }
        if (
            !change.path.startsWith(`${appRoot}/`) ||
            !['create', 'modify'].includes(change.op) ||
            !['100644', '100755'].includes(change.mode)
        ) {
            fail(
                `écriture hors périmètre, destructive ou non régulière : ${change.op} ${change.path}`
            );
        }
    }
}

function applyNormalizations(workspace, appRoot, normalizations = []) {
    for (const normalization of normalizations) {
        if (normalization.kind !== 'exact-replacement') {
            fail(`normalisation inconnue : ${normalization.kind}`);
        }
        const path = `${appRoot}/${normalization.file}`;
        const absolute = regularAppFile(workspace, appRoot, normalization.file);
        const before = readFileSync(absolute, 'utf8');
        const occurrences = before.split(normalization.search).length - 1;
        if (occurrences !== normalization.occurrences) {
            fail(
                `${path}: normalisation attend ${normalization.occurrences} occurrence(s), ${occurrences} trouvée(s)`
            );
        }
        replaceRegularFile(
            workspace,
            path,
            before.replaceAll(normalization.search, normalization.replacement)
        );
    }
}

function safeApp(workspace, app) {
    if (!/^[a-z][a-z0-9-]*$/.test(app)) fail(`nom d'app invalide : ${app}`);
    const appPath = resolve(workspace, 'apps', app);
    const rel = relative(resolve(workspace), appPath);
    if (rel.startsWith(`..${sep}`) || rel === '..') fail('app hors candidat');
    const stats = lstatSync(appPath);
    if (stats.isSymbolicLink() || !stats.isDirectory())
        fail(`apps/${app} n'est pas un vrai répertoire`);
    const project = parseWithoutDuplicateKeys(
        readFileSync(
            regularFile(workspace, `apps/${app}/project.json`),
            'utf8'
        ),
        `apps/${app}/project.json`
    );
    if (project.name !== app)
        fail(`identité Nx ${project.name} différente de ${app}`);
    return `apps/${app}`;
}

export function recipeInvocation({ workspace, recipe, app, track }) {
    if (recipe.install.method === 'official-schematic') {
        regularFile(workspace, 'node_modules/nx/dist/bin/nx.js');
        return {
            hostExecutable: process.execPath,
            containerExecutable: '/usr/local/bin/node',
            argv: [
                'node_modules/nx/dist/bin/nx.js',
                ...recipe.install.command.argv.map((argument) =>
                    argument.replaceAll('{{app}}', app)
                ),
            ],
        };
    }
    if (recipe.install.method === 'reference-derived') {
        regularFile(workspace, recipe.install.reference_tool);
        const version = track.packages.tailwindcss;
        if (!version) fail('version tailwindcss absente de la piste');
        return {
            hostExecutable: process.execPath,
            containerExecutable: '/usr/local/bin/node',
            argv: [
                recipe.install.reference_tool,
                '--app',
                app,
                '--reference',
                recipe.platform,
                '--tailwind-version',
                version,
            ],
        };
    }
    fail(`méthode inconnue : ${recipe.install.method}`);
}

export function addLibraryManifestEntry(workspace, app, platform, library) {
    const path = `apps/${app}/.cmz/libraries.json`;
    const raw = readFileSync(regularFile(workspace, path), 'utf8');
    const manifest = parseWithoutDuplicateKeys(raw, path);
    if (
        manifest.schema_version !== '1.0.0' ||
        manifest.kind !== 'app-library-manifest' ||
        manifest.platform !== platform ||
        !Array.isArray(manifest.libraries)
    ) {
        fail(`${path}: manifeste incompatible`);
    }
    if (manifest.libraries.includes(library))
        fail(`${library} déjà déclarée par ${app}`);
    if (manifest.libraries.some((entry) => typeof entry !== 'string')) {
        fail(`${path}: bibliothèque non textuelle`);
    }
    manifest.libraries = [...manifest.libraries, library].sort();
    replaceRegularFile(
        workspace,
        path,
        `${JSON.stringify(manifest, null, 2)}\n`
    );
}

// Le schematic officiel Material réécrit le package.json racine — mesuré le
// 2026-09-05, sa seule différence est la perte du saut de ligne final, mais
// rien ne garantit qu'un autre schematic, ou une autre version, s'en tienne là.
// L'état des dépendances est arrêté au temps 4 (catalog + bun.lock + plan_id) :
// une écriture de recette ne peut donc être tolérée sur ces deux artefacts que
// si le document reste SÉMANTIQUEMENT identique, et l'octet exact d'origine est
// alors restauré pour que le change-set publié ne charrie pas une reformulation
// cosmétique. Toute divergence réelle est un refus, jamais un rattrapage.
const DEPENDENCY_ARTEFACTS = ['package.json', 'bun.lock'];

function restoreCosmeticDependencyWrites(workspace, snapshotsBefore) {
    for (const path of DEPENDENCY_ARTEFACTS) {
        const before = snapshotsBefore.get(path);
        if (before === undefined) continue;
        const after = readFileSync(join(workspace, path));
        if (after.equals(before)) continue;
        const parsedBefore = parseWithoutDuplicateKeys(
            before.toString('utf8'),
            `${path} avant recette`
        );
        const parsedAfter = parseWithoutDuplicateKeys(
            after.toString('utf8'),
            `${path} après recette`
        );
        if (
            JSON.stringify(parsedBefore) !== JSON.stringify(parsedAfter) ||
            Object.keys(parsedBefore).join('\0') !==
                Object.keys(parsedAfter).join('\0')
        ) {
            fail(
                `${path} : la recette a modifié les dépendances arrêtées au temps 4`
            );
        }
        replaceRegularFile(workspace, path, before);
    }
}

export function executeLibraryRecipe({
    repository,
    candidate,
    recipe,
    track,
    app,
    policy,
    backend,
    cache,
    home,
    run = runConfined,
}) {
    const appRoot = safeApp(candidate.workspace, app);
    const before = snapshotFilesystem(candidate.workspace, {
        excludedDirectories: ['node_modules'],
    });
    const dependencyBytes = new Map(
        DEPENDENCY_ARTEFACTS.filter((path) =>
            existsSync(join(candidate.workspace, path))
        ).map((path) => [path, readFileSync(join(candidate.workspace, path))])
    );
    const invocation = recipeInvocation({
        workspace: candidate.workspace,
        recipe,
        app,
        track,
    });
    const result = run({
        backend,
        profile: 'execution',
        candidate: candidate.workspace,
        cache,
        home,
        repository,
        ...invocation,
        policy,
    });
    if (result.status !== 0)
        fail(`recette en échec (code ${result.status}) : ${result.stderr}`);
    const rawRecipeChanges = buildLibraryChangeSet(
        before,
        snapshotFilesystem(candidate.workspace, {
            excludedDirectories: ['node_modules'],
        })
    );
    validateRecipeChanges(rawRecipeChanges, appRoot, true);
    applyNormalizations(
        candidate.workspace,
        appRoot,
        recipe.install.normalizations
    );
    restoreCosmeticDependencyWrites(candidate.workspace, dependencyBytes);
    const afterRecipe = snapshotFilesystem(candidate.workspace, {
        excludedDirectories: ['node_modules'],
    });
    const recipeChanges = buildLibraryChangeSet(before, afterRecipe);
    validateRecipeChanges(recipeChanges, appRoot, false);
    addLibraryManifestEntry(
        candidate.workspace,
        app,
        recipe.platform,
        recipe.library
    );
    const afterManifest = snapshotFilesystem(candidate.workspace, {
        excludedDirectories: ['node_modules'],
    });
    return buildLibraryChangeSet(before, afterManifest);
}
