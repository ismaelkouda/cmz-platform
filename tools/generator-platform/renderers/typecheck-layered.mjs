/**
 * typecheck-layered.mjs — étape 2 du chantier « générateur en couches »
 * (ADR-0003 §5d).
 *
 * Variante de core/typecheck-generated.mjs pour une sortie répartie en
 * plusieurs packages liés par des alias `@cmz/<domain>-<platform>-<layer>`
 * (ex: `@cmz/content-moderation-angular-domain`). typecheck-generated.mjs
 * type-checke un seul package isolé, sans jamais résoudre d'import
 * inter-package — insuffisant ici puisque data/application importent
 * explicitement domain via cet alias (le vrai test du boundary : si les
 * imports ne se résolvent pas, la compilation échoue, preuve exécutable
 * que le pattern port/token est correctement câblé).
 *
 * `layers` : { domain: { packageName, files }, data: {...},
 * application: {...} } — un seul programme TypeScript virtuel couvrant
 * les 3 racines, `compilerOptions.paths` mappe chaque `packageName` vers
 * son `index.ts` virtuel (résolution d'alias simulée, même principe que
 * tsconfig.base.json en conditions réelles).
 */
import { resolve } from 'node:path';

import ts from 'typescript';

function normalize(path) {
    return resolve(path).replaceAll('\\', '/');
}

export function typecheckLayeredTargets(layers, targetId, repositoryRoot) {
    const base = resolve(
        repositoryRoot,
        'tools/generator-platform/.virtual-layered',
        targetId
    );
    const virtualFiles = new Map();
    const paths = {};
    for (const [layerName, { packageName, files }] of Object.entries(layers)) {
        const layerBase = resolve(base, layerName);
        for (const [path, content] of Object.entries(files)) {
            if (!path.endsWith('.ts')) continue;
            virtualFiles.set(normalize(resolve(layerBase, path)), content);
        }
        paths[packageName] = [normalize(resolve(layerBase, 'src/index.ts'))];
    }
    const options = {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        experimentalDecorators: true,
        paths,
    };
    const host = ts.createCompilerHost(options);
    const originalFileExists = host.fileExists.bind(host);
    const originalDirectoryExists = host.directoryExists?.bind(host);
    const originalReadFile = host.readFile.bind(host);
    const originalGetSourceFile = host.getSourceFile.bind(host);

    host.fileExists = (path) =>
        virtualFiles.has(normalize(path)) || originalFileExists(path);
    host.directoryExists = (path) => {
        const directory = `${normalize(path)}/`;
        return (
            [...virtualFiles.keys()].some((file) =>
                file.startsWith(directory)
            ) ||
            originalDirectoryExists?.(path) ||
            false
        );
    };
    host.readFile = (path) =>
        virtualFiles.get(normalize(path)) ?? originalReadFile(path);
    host.getSourceFile = (path, languageVersion, onError, shouldCreate) => {
        const content = virtualFiles.get(normalize(path));
        if (content !== undefined) {
            return ts.createSourceFile(path, content, languageVersion, true);
        }
        return originalGetSourceFile(
            path,
            languageVersion,
            onError,
            shouldCreate
        );
    };

    const program = ts.createProgram({
        rootNames: [...virtualFiles.keys()],
        options,
        host,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length > 0) {
        const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
            getCanonicalFileName: (path) => path,
            getCurrentDirectory: () => repositoryRoot,
            getNewLine: () => '\n',
        });
        throw new Error(
            `layered target ${targetId} does not typecheck:\n${formatted}`
        );
    }
}

/**
 * Boundary check structurel (ADR-0003 §4) : aucun fichier application ne
 * doit importer directement le package data. Complémentaire au
 * type-check (qui prouve que le code compile, pas qu'il respecte les
 * règles architecturales du repo) — même esprit que
 * @nx/enforce-module-boundaries en conditions réelles, réduit à
 * l'invariant qui compte pour cette sortie générée.
 */
export function assertNoApplicationToDataImport(layers, dataPackageName) {
    const applicationFiles = layers.application?.files ?? {};
    for (const [path, content] of Object.entries(applicationFiles)) {
        if (!path.endsWith('.ts')) continue;
        if (content.includes(`from '${dataPackageName}'`)) {
            throw new Error(
                `boundary violation: application/${path} imports directly from ${dataPackageName} ` +
                    `(ADR-0003 §4 — type:application must depend only on type:domain)`
            );
        }
    }
}
