import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadNxGraph(workspaceRoot) {
    let output;
    try {
        output = execFileSync('bunx', ['nx', 'graph', '--file=stdout'], {
            cwd: workspaceRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
                ...(!process.env.NX_CLOUD_ACCESS_TOKEN
                    ? { NX_NO_CLOUD: 'true' }
                    : {}),
            },
        });
    } catch (error) {
        throw new Error(
            `Graphe Nx obligatoire indisponible : ${error.stderr || error.message}`
        );
    }
    let document;
    try {
        document = JSON.parse(output);
    } catch (error) {
        throw new Error(`Graphe Nx invalide : ${error.message}`);
    }
    if (
        !document?.graph?.nodes ||
        typeof document.graph.nodes !== 'object' ||
        Array.isArray(document.graph.nodes) ||
        !document.graph.dependencies ||
        typeof document.graph.dependencies !== 'object' ||
        Array.isArray(document.graph.dependencies)
    )
        throw new Error('Graphe Nx invalide : nodes/dependencies requis.');
    const graph = document.graph;
    const nodeNames = Object.keys(graph.nodes).sort();
    const dependencySources = Object.keys(graph.dependencies).sort();
    if (JSON.stringify(nodeNames) !== JSON.stringify(dependencySources))
        throw new Error(
            'Graphe Nx incomplet : chaque nœud doit posséder exactement une liste de dépendances.'
        );
    for (const name of nodeNames) {
        const node = graph.nodes[name];
        if (!node || typeof node !== 'object' || node.name !== name)
            throw new Error(`Nœud Nx invalide pour ${name}.`);
        const dependencies = graph.dependencies[name];
        if (!Array.isArray(dependencies))
            throw new Error(`Dépendances Nx invalides pour ${name}.`);
        for (const dependency of dependencies) {
            if (
                dependency?.source !== name ||
                typeof dependency.target !== 'string' ||
                !graph.nodes[dependency.target] ||
                typeof dependency.type !== 'string'
            )
                throw new Error(`Arête Nx invalide pour ${name}.`);
        }
    }
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
                'apps',
                'libs',
            ],
            { cwd: workspaceRoot, encoding: 'utf8' }
        );
    } catch {
        throw new Error('Inventaire Git Nx obligatoire et illisible.');
    }
    const projectNames = inventory
        .split('\0')
        .filter((path) => path.endsWith('/project.json'))
        .map((path) => {
            const absolute = join(workspaceRoot, path);
            const metadata = lstatSync(absolute);
            if (!metadata.isFile() || metadata.isSymbolicLink())
                throw new Error(`Métadonnée Nx non régulière : ${path}.`);
            const name = JSON.parse(readFileSync(absolute, 'utf8'))?.name;
            if (typeof name !== 'string' || !name)
                throw new Error(`Nom Nx absent : ${path}.`);
            return name;
        })
        .sort();
    if (JSON.stringify(nodeNames) !== JSON.stringify(projectNames))
        throw new Error(
            'Graphe Nx incomplet : ses nœuds divergent des project.json Git visibles.'
        );
    return graph;
}

export function findNxGraphConsumers(workspaceRoot, scope) {
    const graph = loadNxGraph(workspaceRoot);
    const selected = new Set(scope.projects.map((project) => project.name));
    for (const project of selected)
        if (!graph.nodes[project])
            throw new Error(
                `Le projet planifié ${project} est absent du graphe Nx.`
            );

    const consumers = [];
    for (const [source, dependencies] of Object.entries(graph.dependencies)) {
        if (!Array.isArray(dependencies))
            throw new Error(`Dépendances Nx invalides pour ${source}.`);
        for (const dependency of dependencies) {
            if (
                dependency?.source !== source ||
                typeof dependency.target !== 'string' ||
                typeof dependency.type !== 'string'
            )
                throw new Error(`Arête Nx invalide pour ${source}.`);
            if (!selected.has(source) && selected.has(dependency.target))
                consumers.push({
                    consumer: source,
                    target: dependency.target,
                    type: dependency.type,
                });
        }
    }
    return consumers.sort((a, b) =>
        `${a.consumer}\0${a.target}`.localeCompare(`${b.consumer}\0${b.target}`)
    );
}

export function runPostRemovalNxGate(workspaceRoot) {
    try {
        const graph = loadNxGraph(workspaceRoot);
        return {
            ok: true,
            output: `Graphe Nx post-retrait valide : ${Object.keys(graph.nodes).length} projet(s).`,
        };
    } catch (error) {
        return { ok: false, output: error.message };
    }
}
