// Contrats du mode de qualification de B. Les opérations Git, installations
// et promotions restent des commandes natives visibles dans le workflow.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const stable = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export function assertQualificationInput(sha, target) {
    if (!/^[0-9a-f]{40}$/.test(sha ?? ''))
        throw new Error('qualification : SHA exact de 40 caractères requis');
    if (!stable.test(target ?? ''))
        throw new Error('qualification : cible stable exacte requise');
}

export function assertInstalledQualificationFamily(root, target) {
    if (!stable.test(target ?? ''))
        throw new Error('cible stable exacte requise');
    const json = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
    const pkg = json('package.json');
    const declared = new Set();
    for (const field of [
        'dependencies',
        'devDependencies',
        'optionalDependencies',
    ]) {
        for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
            if (name !== 'nx' && !name.startsWith('@nx/')) continue;
            if (declared.has(name))
                throw new Error(`déclaration double : ${name}`);
            declared.add(name);
            const version =
                spec === 'catalog:'
                    ? pkg.workspaces?.catalog?.[name]
                    : spec.startsWith('catalog:')
                      ? pkg.workspaces?.catalogs?.[spec.slice(8)]?.[name]
                      : spec;
            if (version !== target)
                throw new Error(`manifeste Nx divergent : ${name}`);
        }
    }
    if (!declared.has('nx') || declared.size < 2)
        throw new Error('famille Nx absente');
    const installed = new Set(declared);
    const scoped = join(root, 'node_modules/@nx');
    if (existsSync(scoped))
        for (const name of readdirSync(scoped))
            if (!name.startsWith('.')) installed.add(`@nx/${name}`);
    for (const name of installed)
        if (json(`node_modules/${name}/package.json`).version !== target)
            throw new Error(`installation Nx divergente : ${name}`);
    // Bun peut conserver une seconde version dans son store, non exposée à
    // la racine : elle fait aussi partie de la famille réellement installée.
    const store = join(root, 'node_modules/.bun');
    if (existsSync(store)) {
        for (const entry of readdirSync(store)) {
            const match = /^(nx|@nx\+[^@]+)@/.exec(entry);
            if (!match) continue;
            const name = match[1].replace('+', '/');
            if (
                json(
                    `node_modules/.bun/${entry}/node_modules/${name}/package.json`
                ).version !== target
            )
                throw new Error(`store Bun Nx divergent : ${name}`);
        }
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
    try {
        const [command, ...args] = process.argv.slice(2);
        if (command === 'input' && args.length === 2)
            assertQualificationInput(...args);
        else if (command === 'installed' && args.length === 1)
            assertInstalledQualificationFamily(process.cwd(), args[0]);
        else throw new Error('usage : input SHA VERSION | installed VERSION');
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
