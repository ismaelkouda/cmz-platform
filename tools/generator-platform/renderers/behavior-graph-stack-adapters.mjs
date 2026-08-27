// Thin, generic per-stack wrappers around the rendered BehaviorGraphEngine
// (renderers/behavior-graph-renderer.mjs). These do not know any concrete
// state or event name either: they only expose the engine through the
// idioms already used elsewhere in this generator (Angular DI token +
// injectable service, ReactJS hooks-port factory), matching the shape
// `permission-runtime-oracle.mjs` already exercises for
// `PERMISSION_PORT`/`createActionRequestHooks`.

export function renderAngularBehaviorGraphService() {
    return `import { Service } from '@angular/core';
import { BehaviorGraphEngine } from './behavior-graph-engine';
import type { BehaviorState } from './behavior-graph-engine';

// Root-scope par défaut correct ici : ce service n'a aucune dépendance
// injectée (l'engine est instancié directement, sans InjectionToken ni
// service scopé en amont) — contrairement à ActionRequestClient/Commands ou
// WorkflowActionService, il n'y a rien qui nécessite un provider explicite
// côté host. Voir autoProvided:false dans angular-nx-renderer.mjs et
// angular-workflow-renderer.mjs pour le cas contraire.
@Service()
export class BehaviorGraphService {
    private readonly engine = new BehaviorGraphEngine();

    get state(): BehaviorState {
        return this.engine.state;
    }

    send(event: string): BehaviorState {
        return this.engine.send(event);
    }
}
`;
}

export function renderReactBehaviorGraphHook() {
    return `import { BehaviorGraphEngine } from './behavior-graph-engine';
import type { BehaviorState } from './behavior-graph-engine';

export interface ReactHooksPort {
    useState<T>(initial: T): readonly [T, (value: T) => void];
    useCallback<TArguments extends unknown[], TResult>(
        callback: (...arguments_: TArguments) => TResult,
        dependencies: readonly unknown[]
    ): (...arguments_: TArguments) => TResult;
}

export interface BehaviorGraphBinding {
    readonly state: BehaviorState;
    readonly send: (event: string) => void;
}

export function createBehaviorGraphHook(hooks: ReactHooksPort) {
    const engine = new BehaviorGraphEngine();
    function useBehaviorGraph(): BehaviorGraphBinding {
        const [state, setState] = hooks.useState<BehaviorState>(engine.state);
        const send = hooks.useCallback((event: string) => {
            const next = engine.send(event);
            setState(next);
        }, [engine]);
        return { state, send };
    }
    return { useBehaviorGraph };
}
`;
}
