import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

function fail(message) {
    throw new Error(message);
}

function compareText(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function toWorkspacePath(workspaceRoot, path) {
    return relative(workspaceRoot, path).split(sep).join('/');
}

function scanProjectJsons(workspaceRoot) {
    let inventory;
    let deletedInventory;
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
                'apps',
                'libs',
            ],
            { cwd: workspaceRoot, encoding: 'utf8' }
        );
        deletedInventory = execFileSync(
            'git',
            ['ls-files', '-z', '--deleted', '--', 'apps', 'libs'],
            { cwd: workspaceRoot, encoding: 'utf8' }
        );
    } catch {
        fail('La résolution Nx exige un inventaire Git canonique lisible.');
    }
    const deletedPaths = new Set(deletedInventory.split('\0').filter(Boolean));
    const entries = inventory
        .split('\0')
        .filter((path) => path && !deletedPaths.has(path))
        .sort(compareText);
    const results = [];
    for (const path of entries) {
        if (
            path.startsWith('/') ||
            path.split(/[\\/]/).includes('..') ||
            !/^(apps|libs)\//.test(path)
        )
            fail(`Chemin Git non sûr pendant la résolution Nx : ${path}`);
        const absolute = join(workspaceRoot, path);
        let metadata;
        try {
            metadata = lstatSync(absolute);
        } catch (error) {
            fail(
                `Entrée Git inaccessible pendant la résolution Nx : ${path} (${error.message})`
            );
        }
        if (metadata.isSymbolicLink())
            fail(`Lien symbolique interdit pendant la résolution Nx : ${path}`);
        if (!metadata.isFile())
            fail(
                `Entrée Git spéciale interdite pendant la résolution Nx : ${path}`
            );
        if (path.endsWith('/project.json')) results.push(absolute);
    }
    return results;
}

function parseProject(workspaceRoot, projectJsonPath) {
    const relativeProjectJson = toWorkspacePath(workspaceRoot, projectJsonPath);
    let metadata;
    try {
        metadata = JSON.parse(readFileSync(projectJsonPath, 'utf8'));
    } catch (error) {
        fail(
            `Métadonnées Nx illisibles ${relativeProjectJson} : ${error.message}`
        );
    }

    const tags = metadata?.tags;
    const scopeTags = Array.isArray(tags)
        ? tags.filter(
              (tag) => typeof tag === 'string' && tag.startsWith('scope:')
          )
        : [];
    if (
        typeof metadata?.name !== 'string' ||
        metadata.name.length === 0 ||
        metadata.name.trim() !== metadata.name ||
        !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(
            metadata.name
        ) ||
        !Array.isArray(tags) ||
        tags.some((tag) => typeof tag !== 'string') ||
        new Set(tags).size !== tags.length ||
        !scopeTags.every((tag) => /^scope:[a-z][a-z0-9-]*$/.test(tag)) ||
        scopeTags.length !== 1
    ) {
        fail(
            `Métadonnées Nx non déterministes dans ${relativeProjectJson} : ` +
                `name non vide, tags textuels et exactement un tag scope:* sont requis.`
        );
    }

    const projectRoot = toWorkspacePath(
        workspaceRoot,
        dirname(projectJsonPath)
    );
    const pathParts = projectRoot.split('/');
    if (
        pathParts.length < 2 ||
        !['apps', 'libs'].includes(pathParts[0]) ||
        !pathParts[1]
    ) {
        fail(`Racine Nx hors apps/* ou libs/* : ${projectRoot}`);
    }

    return {
        name: metadata.name,
        projectJson: relativeProjectJson,
        root: projectRoot,
        scopeTag: scopeTags[0],
        containerRoot: `${pathParts[0]}/${pathParts[1]}`,
    };
}

function canonicalPlan(plan) {
    return JSON.stringify(plan);
}

export function retirementPlanSha256(plan) {
    return createHash('sha256').update(canonicalPlan(plan)).digest('hex');
}

/**
 * Construit la cible destructive depuis l'identité Nx exacte scope:<module>.
 * Aucun nom de dossier, préfixe ou alias approchant n'élargit la sélection.
 */
export function createRetirementPlan(workspaceRoot, moduleName) {
    const resolvedRoot = resolve(workspaceRoot);
    const projects = scanProjectJsons(resolvedRoot).map((path) =>
        parseProject(resolvedRoot, path)
    );
    const names = new Set();
    for (const project of projects) {
        if (names.has(project.name)) {
            fail(`Nom de projet Nx dupliqué : ${project.name}`);
        }
        names.add(project.name);
    }

    const scopeTag = `scope:${moduleName}`;
    const selected = projects.filter(
        (project) => project.scopeTag === scopeTag
    );
    if (selected.length === 0) {
        fail(
            `Aucun projet Nx ne porte le tag exact "${scopeTag}". ` +
                `Aucune sélection par préfixe de dossier n'est autorisée.`
        );
    }

    const roots = [
        ...new Set(selected.map((project) => project.containerRoot)),
    ].sort(compareText);
    for (const root of roots) {
        const foreignProjects = projects.filter(
            (project) =>
                project.containerRoot === root && project.scopeTag !== scopeTag
        );
        if (foreignProjects.length > 0) {
            fail(
                `Conteneur Nx ambigu ${root} : il mélange "${scopeTag}" avec ` +
                    foreignProjects
                        .map(
                            (project) => `${project.name} (${project.scopeTag})`
                        )
                        .sort(compareText)
                        .join(', ') +
                    `. Retrait global refusé.`
            );
        }
    }

    const plan = {
        version: 1,
        module: moduleName,
        scopeTag,
        projects: selected
            .map(({ name, projectJson, root }) => ({ name, projectJson, root }))
            .sort((a, b) => compareText(a.projectJson, b.projectJson)),
        roots,
    };
    return { plan, sha256: retirementPlanSha256(plan) };
}
