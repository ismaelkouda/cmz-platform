import {
    existsSync,
    lstatSync,
    readFileSync,
    readdirSync,
    rmdirSync,
    unlinkSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

function fail(message) {
    throw new Error(`library runtime proof: ${message}`);
}

export function safePath(workspace, path) {
    const target = resolve(workspace, ...path.split('/'));
    const rel = relative(resolve(workspace), target);
    if (rel === '..' || rel.startsWith(`..${sep}`)) {
        fail(`chemin hors candidat : ${path}`);
    }
    return target;
}

export function removeTree(path) {
    if (!existsSync(path)) return;
    const stats = lstatSync(path);
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
        for (const name of readdirSync(path)) removeTree(join(path, name));
        rmdirSync(path);
    } else {
        unlinkSync(path);
    }
}

export function runNode(context, argv, label) {
    const result = context.run({
        backend: context.backend,
        profile: 'execution',
        candidate: context.workspace,
        cache: context.cache,
        home: context.home,
        repository: context.repository,
        hostExecutable: process.execPath,
        containerExecutable: '/usr/local/bin/node',
        argv,
        policy: context.policy,
        timeoutMs: 10 * 60_000,
    });
    if (result.status !== 0) {
        fail(`${label} en échec (code ${result.status}) : ${result.stderr}`);
    }
}

export function projectOutputPath(workspace, app) {
    const project = JSON.parse(
        readFileSync(safePath(workspace, `apps/${app}/project.json`), 'utf8')
    );
    const output = project.targets?.build?.options?.outputPath;
    if (typeof output !== 'string' || !output.startsWith('dist/apps/')) {
        fail(`outputPath Nx non reconnu pour ${app}`);
    }
    return safePath(workspace, output);
}

export function cssFiles(root) {
    const found = [];
    function visit(path) {
        const stats = lstatSync(path);
        if (stats.isSymbolicLink()) {
            fail('lien symbolique dans la sortie de build');
        }
        if (stats.isDirectory()) {
            for (const name of readdirSync(path)) visit(join(path, name));
        } else if (stats.isFile() && path.endsWith('.css')) {
            found.push(path);
        } else if (!stats.isFile()) {
            fail('fichier spécial dans la sortie de build');
        }
    }
    visit(root);
    return found;
}

export function nxBuild(context, app, configuration = 'development') {
    runNode(
        context,
        [
            'node_modules/nx/dist/bin/nx.js',
            'run',
            `${app}:build:${configuration}`,
            '--skip-nx-cache',
        ],
        `build Angular ${app}`
    );
}

export function buildAndClean(context, app) {
    const output = projectOutputPath(context.workspace, app);
    if (existsSync(output)) fail('sortie de build préexistante');
    nxBuild(context, app);
    if (!existsSync(output) || !lstatSync(output).isDirectory()) {
        fail(`le build de ${app} n'a produit aucune sortie régulière`);
    }
    removeTree(output);
}
