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

async function materialize(root, targetId, files) {
    const targetRoot = resolve(root, targetId);
    for (const [path, content] of Object.entries(files)) {
        if (!path.endsWith('.ts')) continue;
        const outputPath = resolve(targetRoot, path.replace(/\.ts$/, '.js'));
        await mkdir(dirname(outputPath), { recursive: true });
        const output = ts.transpileModule(content, {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.ESNext,
                experimentalDecorators: true,
                useDefineForClassFields: true,
            },
        }).outputText;
        await writeFile(outputPath, addJavaScriptExtensions(output));
    }
    return targetRoot;
}

export async function materializeWorkflowRuntime(targets) {
    const root = await mkdtemp(resolve(tmpdir(), 'cmz-workflow-runtime-'));
    await writeFile(resolve(root, 'package.json'), '{"type":"module"}\n');
    await symlink(
        resolve(repositoryRoot, 'node_modules'),
        resolve(root, 'node_modules'),
        'dir'
    );
    const [angularRoot, reactRoot] = await Promise.all([
        materialize(root, 'angular', targets.angular.files),
        materialize(root, 'react', targets.react.files),
    ]);
    await import('@angular/compiler');
    const [angularService, reactHooks] = await Promise.all([
        import(
            pathToFileURL(
                resolve(angularRoot, 'src/workflow-action.service.js')
            ).href
        ),
        import(
            pathToFileURL(resolve(reactRoot, 'src/use-workflow-action.js')).href
        ),
    ]);
    return {
        angular: angularService,
        react: reactHooks,
        cleanup: () => rm(root, { recursive: true, force: true }),
    };
}
