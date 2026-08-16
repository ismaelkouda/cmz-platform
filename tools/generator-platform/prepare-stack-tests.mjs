import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeTargets } from './render-targets.mjs';
import {
    computeEvolvableCompositionTargets,
    directorContractPath,
} from './check-evolvable-composition.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';
import { renderBehaviorGraphEngine } from './renderers/behavior-graph-renderer.mjs';
import {
    renderAngularBehaviorGraphService,
    renderReactBehaviorGraphHook,
} from './renderers/behavior-graph-stack-adapters.mjs';
import { loadJson } from './validate-ir.mjs';

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

const [actionRequest, authorizedActionRequest, workflowAction, contract] =
    await Promise.all([
        computeTargets(),
        computeEvolvableCompositionTargets(),
        computeWorkflowTargets(),
        loadJson(directorContractPath),
    ]);
const sourceKey = target === 'angular' ? 'angular' : 'react';
const targetRoot = resolve(outputRoot, target);

const behaviorGraphEngineSource = renderBehaviorGraphEngine(
    contract.evolution.behavior_graph
);
const behaviorGraphFiles =
    target === 'angular'
        ? {
              'behavior-graph-engine.ts': behaviorGraphEngineSource,
              'behavior-graph.service.ts': renderAngularBehaviorGraphService(),
          }
        : {
              'behavior-graph-engine.ts': behaviorGraphEngineSource,
              'use-behavior-graph.ts': renderReactBehaviorGraphHook(),
          };

await rm(targetRoot, { recursive: true, force: true });
await Promise.all([
    writeTargetFiles(
        resolve(targetRoot, 'action-request'),
        actionRequest[sourceKey].files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'action-request-authorized'),
        authorizedActionRequest.targets[sourceKey].files
    ),
    writeTargetFiles(
        resolve(targetRoot, 'workflow-action'),
        workflowAction[sourceKey].files
    ),
    writeTargetFiles(resolve(targetRoot, 'behavior-graph'), behaviorGraphFiles),
]);

console.log(`Prepared generated ${target} sources for native stack tests.`);
