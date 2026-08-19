import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import '@angular/compiler';
import { createEnvironmentInjector } from '@angular/core';
import ts from 'typescript';

import {
    renderAngularPresentationFlowService,
    renderReactPresentationFlowHook,
} from '../renderers/presentation-flow-stack-adapters.mjs';
import { renderPresentationFlowEngine } from '../renderers/presentation-flow-renderer.mjs';
import { repositoryRoot } from '../validate-ir.mjs';

// Real execution oracle for the presentation flow declared by the director
// contract (`evolution.presentation`). This never validates the wizard
// declaration against a JSON schema and calls that "proof" — the whole
// point of PLAT-5J is to replace exactly that kind of check
// (`validateJsonSchema(...).length === 0` plus a substring search for
// `'confirmation'` in rendered output) with generated code that is
// transpiled, loaded and actually driven step by step in both stacks:
// starting at the declared first step, refusing to skip ahead or advance
// out of order, refusing to advance past an incomplete step, accepting
// advance only once the current step's declared fields are complete, and
// allowing a one-step-back navigation.

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
                `presentation flow oracle: transpilation failed for ${path}: ${ts.formatDiagnostics(
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
 * Builds a values object that satisfies every field declared by `step`
 * with a non-blank placeholder string, so the oracle can prove the
 * "complete step" advance path without needing real business data.
 */
function completeValuesFor(declaration, stepId) {
    const step = declaration.steps.find((candidate) => candidate.id === stepId);
    return Object.fromEntries(
        step.fields.map((field) => [field, `oracle-value-${field}`])
    );
}

/**
 * Runs the full lifecycle for both stacks against one declared
 * presentation flow: starts on the declared first step, proves fail-closed
 * refusal of (a) skipping ahead to a step beyond the immediate next one,
 * (b) advancing to an unknown step, and (c) advancing before the current
 * step's declared fields are complete — none of these progress the
 * current step — then proves the declared happy path advances through
 * every step in order once each step is completed, and that a one-step
 * back navigation is accepted while a deeper back-jump is refused.
 */
export async function assertPresentationFlowRuntimeOracle(
    declaration,
    { engineSource: engineSourceOverride } = {}
) {
    const root = await mkdtemp(
        resolve(tmpdir(), 'cmz-presentation-flow-runtime-')
    );
    try {
        await writeFile(resolve(root, 'package.json'), '{"type":"module"}\n');
        await symlink(
            resolve(repositoryRoot, 'node_modules'),
            resolve(root, 'node_modules'),
            'dir'
        );
        const engineSource =
            engineSourceOverride ?? renderPresentationFlowEngine(declaration);
        const angularServiceSource = renderAngularPresentationFlowService();
        const reactHookSource = renderReactPresentationFlowHook();
        await materialize(root, {
            'angular/presentation-flow-engine.ts': engineSource,
            'angular/presentation-flow.service.ts': angularServiceSource,
            'react/presentation-flow-engine.ts': engineSource,
            'react/use-presentation-flow.ts': reactHookSource,
        });

        const [
            angularEngineModule,
            angularServiceModule,
            reactEngineModule,
            reactModule,
        ] = await Promise.all([
            import(
                pathToFileURL(
                    resolve(root, 'angular/presentation-flow-engine.js')
                ).href
            ),
            import(
                pathToFileURL(
                    resolve(root, 'angular/presentation-flow.service.js')
                ).href
            ),
            import(
                pathToFileURL(
                    resolve(root, 'react/presentation-flow-engine.js')
                ).href
            ),
            import(
                pathToFileURL(resolve(root, 'react/use-presentation-flow.js'))
                    .href
            ),
        ]);

        const steps = declaration.steps.map((step) => step.id);
        assert.ok(
            steps.length >= 2,
            'Oracle: flow must declare at least two steps to prove ordering'
        );
        const [firstStep, secondStep] = steps;
        const lastStep = steps.at(-1);
        const beyondNextStep = steps[2] ?? null;
        const unknownStep = 'unknown-step-not-in-contract';

        // --- Angular: DI-provided service, mirrors behavior-graph-runtime-oracle ---
        const injector = createEnvironmentInjector(
            [angularServiceModule.PresentationFlowService],
            null
        );
        const angularService = injector.get(
            angularServiceModule.PresentationFlowService
        );
        try {
            assert.equal(
                angularService.step,
                firstStep,
                'Angular: flow must start on the declared first step'
            );

            let angularUnknownRefused = false;
            try {
                angularService.advance(unknownStep, {});
            } catch (error) {
                angularUnknownRefused =
                    error instanceof
                        angularEngineModule.PresentationFlowViolation &&
                    error.code === 'presentation_flow_advance_refused';
            }
            assert.ok(
                angularUnknownRefused,
                'Angular: advancing to an unknown step must throw PresentationFlowViolation'
            );
            assert.equal(
                angularService.step,
                firstStep,
                'Angular: step must not change after a refused advance to an unknown step'
            );

            if (beyondNextStep) {
                let angularSkipRefused = false;
                try {
                    angularService.advance(
                        beyondNextStep,
                        completeValuesFor(declaration, firstStep)
                    );
                } catch (error) {
                    angularSkipRefused =
                        error instanceof
                            angularEngineModule.PresentationFlowViolation &&
                        error.code === 'presentation_flow_advance_refused';
                }
                assert.ok(
                    angularSkipRefused,
                    'Angular: skipping ahead past the immediate next step must be refused'
                );
                assert.equal(
                    angularService.step,
                    firstStep,
                    'Angular: step must not change after a refused skip-ahead'
                );
            }

            const firstStepFields = declaration.steps[0].fields;
            if (firstStepFields.length > 0) {
                let angularIncompleteRefused = false;
                try {
                    angularService.advance(secondStep, {});
                } catch (error) {
                    angularIncompleteRefused =
                        error instanceof
                            angularEngineModule.PresentationFlowViolation &&
                        error.code === 'presentation_flow_advance_refused';
                }
                assert.ok(
                    angularIncompleteRefused,
                    'Angular: advancing with an incomplete current step must be refused'
                );
                assert.equal(
                    angularService.step,
                    firstStep,
                    'Angular: step must not change after a refused incomplete advance'
                );
            }

            assert.equal(
                angularService.advance(
                    secondStep,
                    completeValuesFor(declaration, firstStep)
                ),
                secondStep,
                'Angular: declared advance to the immediate next step must succeed once complete'
            );

            for (const [index, stepId] of steps.slice(2).entries()) {
                const previousStep = steps[index + 1];
                assert.equal(
                    angularService.advance(
                        stepId,
                        completeValuesFor(declaration, previousStep)
                    ),
                    stepId,
                    `Angular: declared advance must reach ${stepId} in order`
                );
            }
            assert.equal(
                angularService.step,
                lastStep,
                'Angular: full declared happy path must reach the terminal step'
            );

            if (steps.length >= 3) {
                // From the terminal step, stepping back 2+ positions in one
                // call (skipping the immediately preceding step) must be
                // refused — only a single-step back-jump is ever accepted.
                const tooFarBackTarget = steps.at(-3);
                let angularBackTooFarRefused = false;
                try {
                    angularService.back(tooFarBackTarget);
                } catch (error) {
                    angularBackTooFarRefused =
                        error instanceof
                            angularEngineModule.PresentationFlowViolation &&
                        error.code === 'presentation_flow_advance_refused';
                }
                assert.ok(
                    angularBackTooFarRefused,
                    'Angular: stepping back more than one step must be refused'
                );
                assert.equal(
                    angularService.step,
                    lastStep,
                    'Angular: step must not change after a refused deep back-jump'
                );
            }

            assert.equal(
                angularService.back(steps.at(-2)),
                steps.at(-2),
                'Angular: stepping back one step must be accepted'
            );
        } finally {
            injector.destroy();
        }

        // --- ReactJS: hooks-port factory, mirrors createBehaviorGraphHook ---
        {
            const transitions = [];
            const { usePresentationFlow } =
                reactModule.createPresentationFlowHook(
                    reactHooksPort(transitions)
                );
            const binding = usePresentationFlow();
            assert.equal(
                binding.step,
                firstStep,
                'ReactJS: flow must start on the declared first step'
            );

            let reactUnknownRefused = false;
            try {
                binding.advance(unknownStep, {});
            } catch (error) {
                reactUnknownRefused =
                    error instanceof
                        reactEngineModule.PresentationFlowViolation &&
                    error.code === 'presentation_flow_advance_refused';
            }
            assert.ok(
                reactUnknownRefused,
                'ReactJS: advancing to an unknown step must throw and never call setState'
            );
            assert.deepEqual(
                transitions,
                [],
                'ReactJS: state must not change after a refused advance to an unknown step'
            );

            const firstStepFields = declaration.steps[0].fields;
            if (firstStepFields.length > 0) {
                let reactIncompleteRefused = false;
                try {
                    binding.advance(secondStep, {});
                } catch (error) {
                    reactIncompleteRefused =
                        error instanceof
                            reactEngineModule.PresentationFlowViolation &&
                        error.code === 'presentation_flow_advance_refused';
                }
                assert.ok(
                    reactIncompleteRefused,
                    'ReactJS: advancing with an incomplete current step must be refused'
                );
                assert.deepEqual(
                    transitions,
                    [],
                    'ReactJS: state must not change after a refused incomplete advance'
                );
            }

            binding.advance(
                secondStep,
                completeValuesFor(declaration, firstStep)
            );
            for (const [index, stepId] of steps.slice(2).entries()) {
                const previousStep = steps[index + 1];
                binding.advance(
                    stepId,
                    completeValuesFor(declaration, previousStep)
                );
            }
            assert.deepEqual(
                transitions,
                steps.slice(1),
                'ReactJS: declared happy path must set every step in order'
            );

            if (steps.length >= 3) {
                const tooFarBackTarget = steps.at(-3);
                let reactBackTooFarRefused = false;
                try {
                    binding.back(tooFarBackTarget);
                } catch (error) {
                    reactBackTooFarRefused =
                        error instanceof
                            reactEngineModule.PresentationFlowViolation &&
                        error.code === 'presentation_flow_advance_refused';
                }
                assert.ok(
                    reactBackTooFarRefused,
                    'ReactJS: stepping back more than one step must be refused'
                );
                assert.equal(
                    transitions.at(-1),
                    lastStep,
                    'ReactJS: state must not change after a refused deep back-jump'
                );
            }

            binding.back(steps.at(-2));
            assert.equal(
                transitions.at(-1),
                steps.at(-2),
                'ReactJS: stepping back one step must be accepted'
            );
        }

        return true;
    } finally {
        await rm(root, { recursive: true, force: true });
    }
}
