import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeTargets } from './render-targets.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';

const generatorRoot = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(generatorRoot, '.stack-test-runtime');
const target = process.argv[2];

if (!['angular', 'reactjs'].includes(target)) {
    throw new Error(
        'Usage: node tools/generator-platform/prepare-stack-tests.mjs <angular|reactjs>'
    );
}

async function writeTargetFiles(root, files) {
    for (const [relativePath, content] of Object.entries(files)) {
        const outputPath = resolve(root, relativePath);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, content);
    }
}

const [actionRequest, workflowAction] = await Promise.all([
    computeTargets(),
    computeWorkflowTargets(),
]);
const sourceKey = target === 'angular' ? 'angular' : 'react';
const targetRoot = resolve(outputRoot, target);

await rm(targetRoot, { recursive: true, force: true });
await Promise.all([
    writeTargetFiles(
        resolve(targetRoot, 'action-request'),
        actionRequest[sourceKey].files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'workflow-action'),
        workflowAction[sourceKey].files
    ),
]);

console.log(`Prepared generated ${target} sources for native stack tests.`);
