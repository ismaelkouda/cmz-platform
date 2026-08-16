import { resolve } from 'node:path';

import ts from 'typescript';

function normalize(path) {
    return resolve(path).replaceAll('\\', '/');
}

export function typecheckGenerated(files, targetId, repositoryRoot) {
    const base = resolve(
        repositoryRoot,
        'tools/generator-platform/.virtual',
        targetId
    );
    const virtualFiles = new Map(
        Object.entries(files)
            .filter(([path]) => path.endsWith('.ts'))
            .map(([path, content]) => [normalize(resolve(base, path)), content])
    );
    const options = {
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        experimentalDecorators: true,
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
            `generated target ${targetId} does not typecheck:\n${formatted}`
        );
    }
}
