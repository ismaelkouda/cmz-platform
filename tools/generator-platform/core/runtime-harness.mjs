import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

import { repositoryRoot } from '../validate-ir.mjs';

function addJavaScriptExtensions(output) {
    return output.replace(
        /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
        (_match, prefix, specifier, suffix) =>
            `${prefix}${specifier.endsWith('.js') ? specifier : `${specifier}.js`}${suffix}`
    );
}

async function materializeTarget(root, targetId, files) {
    const targetRoot = resolve(root, targetId);
    for (const [path, content] of Object.entries(files)) {
        if (!path.endsWith('.ts')) continue;
        const outputPath = resolve(targetRoot, path.replace(/\.ts$/, '.js'));
        await mkdir(dirname(outputPath), { recursive: true });
        const transpiled = ts.transpileModule(content, {
            fileName: path,
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
                experimentalDecorators: true,
                useDefineForClassFields: true,
            },
            reportDiagnostics: true,
        });
        if (transpiled.diagnostics?.length) {
            throw new Error(
                `runtime transpilation failed for ${targetId}/${path}: ${ts.formatDiagnostics(
                    transpiled.diagnostics,
                    {
                        getCanonicalFileName: (name) => name,
                        getCurrentDirectory: () => repositoryRoot,
                        getNewLine: () => '\n',
                    }
                )}`
            );
        }
        await writeFile(
            outputPath,
            addJavaScriptExtensions(transpiled.outputText)
        );
    }
    return targetRoot;
}

async function importModule(root, path) {
    return import(pathToFileURL(resolve(root, path)).href);
}

export async function materializeGeneratedRuntime(targets) {
    const root = await mkdtemp(resolve(tmpdir(), 'cmz-generator-runtime-'));
    await writeFile(resolve(root, 'package.json'), '{"type":"module"}\n');
    await symlink(
        resolve(repositoryRoot, 'node_modules'),
        resolve(root, 'node_modules'),
        'dir'
    );
    const [angularRoot, reactRoot] = await Promise.all([
        materializeTarget(root, 'angular-nx', targets.angular.files),
        materializeTarget(root, 'react-typescript', targets.react.files),
    ]);

    await import('@angular/compiler');
    const [
        angularClient,
        angularCommands,
        angularValidation,
        reactClient,
        reactHooks,
        reactValidation,
    ] = await Promise.all([
        importModule(angularRoot, 'src/action-request-client.js'),
        importModule(angularRoot, 'src/action-request-commands.js'),
        importModule(angularRoot, 'src/validation.js'),
        importModule(reactRoot, 'src/action-request-client.js'),
        importModule(reactRoot, 'src/use-action-request-commands.js'),
        importModule(reactRoot, 'src/validation.js'),
    ]);

    return {
        angular: {
            client: angularClient,
            commands: angularCommands,
            validation: angularValidation,
        },
        react: {
            client: reactClient,
            hooks: reactHooks,
            validation: reactValidation,
        },
        cleanup: () => rm(root, { recursive: true, force: true }),
    };
}
