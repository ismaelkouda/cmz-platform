import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeTargets } from './render-targets.mjs';
import {
    computeEvolvableCompositionTargets,
    directorContractPath,
} from './check-evolvable-composition.mjs';
import { computeWorkflowTargets } from './workflow-targets.mjs';
import { computeAngularListQueryV2Target } from './list-query-v2-targets.mjs';
import { renderBehaviorGraphEngine } from './renderers/behavior-graph-renderer.mjs';
import {
    renderAngularBehaviorGraphService,
    renderReactBehaviorGraphHook,
} from './renderers/behavior-graph-stack-adapters.mjs';
import { renderPresentationFlowEngine } from './renderers/presentation-flow-renderer.mjs';
import {
    renderAngularPresentationFlowService,
    renderReactPresentationFlowHook,
} from './renderers/presentation-flow-stack-adapters.mjs';
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

const [
    actionRequest,
    authorizedActionRequest,
    workflowAction,
    contract,
    listQueryV2,
    publicListQueryV2,
] = await Promise.all([
    computeTargets(),
    computeEvolvableCompositionTargets(),
    computeWorkflowTargets(),
    loadJson(directorContractPath),
    target === 'angular'
        ? computeAngularListQueryV2Target()
        : Promise.resolve(undefined),
    target === 'angular'
        ? computeAngularListQueryV2Target({
              definitionPath: resolve(
                  generatorRoot,
                  'fixtures/editorial-blocks.v2.definition.json'
              ),
          })
        : Promise.resolve(undefined),
]);
const sourceKey = target === 'angular' ? 'angular' : 'react';
const targetRoot = resolve(outputRoot, target);
const runtimeConfigurationFiles =
    target === 'angular'
        ? {
              'tsconfig.json': `${JSON.stringify(
                  {
                      extends: '../../../../tsconfig.base.json',
                      compilerOptions: {
                          emitDecoratorMetadata: true,
                          experimentalDecorators: true,
                      },
                      include: ['**/*.ts'],
                  },
                  null,
                  4
              )}\n`,
          }
        : {};

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

const presentationFlowEngineSource = renderPresentationFlowEngine(
    contract.evolution.presentation
);
const presentationFlowFiles =
    target === 'angular'
        ? {
              'presentation-flow-engine.ts': presentationFlowEngineSource,
              'presentation-flow.service.ts':
                  renderAngularPresentationFlowService(),
          }
        : {
              'presentation-flow-engine.ts': presentationFlowEngineSource,
              'use-presentation-flow.ts': renderReactPresentationFlowHook(),
          };

await rm(targetRoot, { recursive: true, force: true });
await Promise.all([
    writeTargetFiles(targetRoot, runtimeConfigurationFiles),
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
    ...(listQueryV2
        ? [
              writeTargetFiles(
                  resolve(targetRoot, 'list-query-v2'),
                  listQueryV2.files
              ),
          ]
        : []),
    ...(publicListQueryV2
        ? [
              writeTargetFiles(
                  resolve(targetRoot, 'list-query-v2-public'),
                  publicListQueryV2.files
              ),
          ]
        : []),
    writeTargetFiles(resolve(targetRoot, 'behavior-graph'), behaviorGraphFiles),
    writeTargetFiles(
        resolve(targetRoot, 'presentation-flow'),
        presentationFlowFiles
    ),
]);

console.log(`Prepared generated ${target} sources for native stack tests.`);
