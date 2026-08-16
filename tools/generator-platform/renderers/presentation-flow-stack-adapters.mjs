// Thin, generic per-stack wrappers around the rendered PresentationFlowEngine
// (renderers/presentation-flow-renderer.mjs). These do not know any concrete
// step id or field name either: they only expose the engine through the
// idioms already used elsewhere in this generator (Angular DI token +
// injectable service, ReactJS hooks-port factory), matching the shape
// `behavior-graph-stack-adapters.mjs` already exercises.

export function renderAngularPresentationFlowService() {
    return `import { Injectable } from '@angular/core';
import { PresentationFlowEngine } from './presentation-flow-engine';
import type { PresentationStep } from './presentation-flow-engine';

@Injectable()
export class PresentationFlowService {
    private readonly engine = new PresentationFlowEngine();

    get step(): PresentationStep {
        return this.engine.step;
    }

    isCurrentStepComplete(values: Readonly<Record<string, unknown>>): boolean {
        return this.engine.isCurrentStepComplete(values);
    }

    advance(
        targetStep: string,
        values: Readonly<Record<string, unknown>>
    ): PresentationStep {
        return this.engine.advance(targetStep, values);
    }

    back(targetStep: string): PresentationStep {
        return this.engine.back(targetStep);
    }
}
`;
}

export function renderReactPresentationFlowHook() {
    return `import { PresentationFlowEngine } from './presentation-flow-engine';
import type { PresentationStep } from './presentation-flow-engine';

export interface ReactHooksPort {
    useState<T>(initial: T): readonly [T, (value: T) => void];
    useCallback<TArguments extends unknown[], TResult>(
        callback: (...arguments_: TArguments) => TResult,
        dependencies: readonly unknown[]
    ): (...arguments_: TArguments) => TResult;
}

export interface PresentationFlowBinding {
    readonly step: PresentationStep;
    readonly isCurrentStepComplete: (
        values: Readonly<Record<string, unknown>>
    ) => boolean;
    readonly advance: (
        targetStep: string,
        values: Readonly<Record<string, unknown>>
    ) => void;
    readonly back: (targetStep: string) => void;
}

export function createPresentationFlowHook(hooks: ReactHooksPort) {
    const engine = new PresentationFlowEngine();
    function usePresentationFlow(): PresentationFlowBinding {
        const [step, setStep] = hooks.useState<PresentationStep>(engine.step);
        const advance = hooks.useCallback(
            (targetStep: string, values: Readonly<Record<string, unknown>>) => {
                const next = engine.advance(targetStep, values);
                setStep(next);
            },
            [engine]
        );
        const back = hooks.useCallback(
            (targetStep: string) => {
                const next = engine.back(targetStep);
                setStep(next);
            },
            [engine]
        );
        const isCurrentStepComplete = hooks.useCallback(
            (values: Readonly<Record<string, unknown>>) =>
                engine.isCurrentStepComplete(values),
            [engine]
        );
        return { step, isCurrentStepComplete, advance, back };
    }
    return { usePresentationFlow };
}
`;
}
