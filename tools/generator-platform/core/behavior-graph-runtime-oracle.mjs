import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import ts from 'typescript';

import {
    renderAngularBehaviorGraphService,
    renderReactBehaviorGraphHook,
} from '../renderers/behavior-graph-stack-adapters.mjs';
import { renderBehaviorGraphEngine } from '../renderers/behavior-graph-renderer.mjs';
import { repositoryRoot } from '../validate-ir.mjs';

// Real execution oracle for the behavior graph declared by the director
// contract (`evolution.behavior_graph`). This never validates the graph
// declaration against a JSON schema and calls that "proof" — the whole
// point of PLAT-5I is to replace exactly that kind of check
// (`validateJsonSchema(...).length === 0`) with generated code that is
// transpiled, loaded and actually driven through its declared transitions
// in both stacks, including the fail-closed path on an event the graph
// never declared.

function reactHooksPort(transitions) {
    return {
        useState(initial) {
            return [initial, (value) => transitions.push(value)];
        },
        useCallback(callback) {
            return callback;
        },
    };
}

function addJavaScriptExtensions(output) {
    return output.replace(
        /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
        (_match, prefix, specifier, suffix) =>
            `${prefix}${specifier.endsWith('.js') ? specifier : `${specifier}.js`}${suffix}`
    );
}

async function materialize(root, files) {
    for (const [path, content] of Object.entries(files)) {
        const outputPath = resolve(root, path.replace(/\.ts$/, '.js'));
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
                `behavior graph oracle: transpilation failed for ${path}: ${ts.formatDiagnostics(
                    transpiled.diagnostics,
                    {
                        getCanonicalFileName: (name) => name,
                        getCurrentDirectory: () => root,
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
}

/**
 * Runs the full lifecycle for both stacks against one declared behavior
 * graph: starts in the declared initial state, follows the declared
 * `submit`/`accepted`/`business-rejected`-shaped happy paths (parameterized
 * by the actual edges, never hard-coded event names), and proves an event
 * absent from the graph is refused without progressing state — the
 * fail-closed guard PLAT-5I exists to prove.
 */
export async function assertBehaviorGraphRuntimeOracle(
    declaration,
    { engineSource: engineSourceOverride } = {}
) {
    const root = await mkdtemp(
        resolve(tmpdir(), 'cmz-behavior-graph-runtime-')
    );
    try {
        await writeFile(resolve(root, 'package.json'), '{"type":"module"}\n');
        await symlink(
            resolve(repositoryRoot, 'node_modules'),
            resolve(root, 'node_modules'),
            'dir'
        );
        const engineSource =
            engineSourceOverride ?? renderBehaviorGraphEngine(declaration);
        const angularServiceSource = renderAngularBehaviorGraphService();
        const reactHookSource = renderReactBehaviorGraphHook();
        await materialize(root, {
            'angular/behavior-graph-engine.ts': engineSource,
            'angular/behavior-graph.service.ts': angularServiceSource,
            'react/behavior-graph-engine.ts': engineSource,
            'react/use-behavior-graph.ts': reactHookSource,
        });

        const [
            angularEngineModule,
            angularServiceModule,
            reactEngineModule,
            reactModule,
        ] = await Promise.all([
            import(
                pathToFileURL(resolve(root, 'angular/behavior-graph-engine.js'))
                    .href
            ),
            import(
                pathToFileURL(
                    resolve(root, 'angular/behavior-graph.service.js')
                ).href
            ),
            import(
                pathToFileURL(resolve(root, 'react/behavior-graph-engine.js'))
                    .href
            ),
            import(
                pathToFileURL(resolve(root, 'react/use-behavior-graph.js')).href
            ),
        ]);

        const initialEdge = declaration.edges.find(
            (edge) => edge.from === declaration.initial
        );
        assert.ok(
            initialEdge,
            'Oracle: graph must declare at least one edge from its initial state'
        );
        const secondEdges = declaration.edges.filter(
            (edge) => edge.from === initialEdge.to
        );
        assert.ok(
            secondEdges.length >= 1,
            'Oracle: graph must declare at least one edge from the state reached by the first transition'
        );
        const undeclaredEvent = 'undeclared-event-not-in-contract';
        assert.ok(
            !declaration.edges.some(
                (edge) =>
                    edge.from === declaration.initial &&
                    edge.event === undeclaredEvent
            ),
            'Oracle: sentinel event must not collide with a declared transition'
        );

        // --- Angular: DI-provided service, mirrors permission-runtime-oracle ---
        const injector = createEnvironmentInjector(
            [angularServiceModule.BehaviorGraphService],
            null
        );
        const angularService = injector.get(
            angularServiceModule.BehaviorGraphService
        );
        try {
            assert.equal(
                angularService.state,
                declaration.initial,
                'Angular: engine must start in the declared initial state'
            );
            let angularRefused = false;
            try {
                angularService.send(undeclaredEvent);
            } catch (error) {
                angularRefused =
                    error instanceof
                        angularEngineModule.BehaviorGraphViolation &&
                    error.code === 'behavior_transition_refused';
            }
            assert.ok(
                angularRefused,
                'Angular: an undeclared event must throw BehaviorGraphViolation'
            );
            assert.equal(
                angularService.state,
                declaration.initial,
                'Angular: state must not change after a refused transition'
            );

            assert.equal(
                angularService.send(initialEdge.event),
                initialEdge.to,
                'Angular: declared first transition must succeed'
            );
            for (const edge of secondEdges) {
                const scoped = createEnvironmentInjector(
                    [angularServiceModule.BehaviorGraphService],
                    null
                );
                const service = scoped.get(
                    angularServiceModule.BehaviorGraphService
                );
                service.send(initialEdge.event);
                assert.equal(
                    service.send(edge.event),
                    edge.to,
                    `Angular: declared transition ${edge.from}/${edge.event} must reach ${edge.to}`
                );
                scoped.destroy();
            }
        } finally {
            injector.destroy();
        }

        // --- ReactJS: hooks-port factory, mirrors createActionRequestHooks ---
        for (const edge of secondEdges) {
            const transitions = [];
            const { useBehaviorGraph } = reactModule.createBehaviorGraphHook(
                reactHooksPort(transitions)
            );
            const binding = useBehaviorGraph();
            assert.equal(
                binding.state,
                declaration.initial,
                'ReactJS: engine must start in the declared initial state'
            );
            binding.send(initialEdge.event);
            binding.send(edge.event);
            assert.deepEqual(
                transitions,
                [initialEdge.to, edge.to],
                `ReactJS: declared transitions must reach ${edge.to} via ${edge.from}`
            );
        }

        {
            const transitions = [];
            const { useBehaviorGraph } = reactModule.createBehaviorGraphHook(
                reactHooksPort(transitions)
            );
            const binding = useBehaviorGraph();
            let reactRefused = false;
            try {
                binding.send(undeclaredEvent);
            } catch (error) {
                reactRefused =
                    error instanceof reactEngineModule.BehaviorGraphViolation &&
                    error.code === 'behavior_transition_refused';
            }
            assert.ok(
                reactRefused,
                'ReactJS: an undeclared event must throw and never call setState'
            );
            assert.deepEqual(
                transitions,
                [],
                'ReactJS: state must not change after a refused transition'
            );
        }

        return true;
    } finally {
        await rm(root, { recursive: true, force: true });
    }
}
