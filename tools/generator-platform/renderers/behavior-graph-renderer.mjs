import { compileBehaviorGraph } from '../core/behavior-graph.mjs';

// Renders a generic, data-driven finite-state-machine runtime for a
// behavior graph declared by the director contract (ADR-0030 Behavior
// model, ADR-0031 execution graph). The generated code never hard-codes
// state or event names as control flow: it looks up
// `${state}/${event}` in a frozen transition table produced from the exact
// graph it was compiled from, and fails closed (no state change, a
// rejection result) on any event absent from that table. This keeps the
// renderer generic across whichever graph a contract declares, instead of
// duplicating a fixed workflow shape the way `workflow-action-model.mjs`
// intentionally does for its own bounded domain.

function renderTransitionTableLiteral(compiled) {
    const entries = compiled.edges
        .map((edge) => `    ['${edge.from} ${edge.event}', '${edge.to}'],`)
        .join('\n');
    return `[\n${entries}\n]`;
}

export function renderBehaviorGraphEngine(declaration) {
    const compiled = compileBehaviorGraph(declaration);
    const stateUnion = compiled.nodes.map((node) => `'${node}'`).join(' | ');
    const table = renderTransitionTableLiteral(compiled);
    return `export type BehaviorState = ${stateUnion};

export interface BehaviorTransitionResult {
    readonly accepted: boolean;
    readonly state: BehaviorState;
}

const INITIAL_STATE: BehaviorState = '${compiled.initial}';
const TRANSITIONS = new Map<string, BehaviorState>(${table});

export class BehaviorGraphViolation extends Error {
    readonly code = 'behavior_transition_refused';

    constructor(
        readonly fromState: BehaviorState,
        readonly event: string
    ) {
        super(
            \`No declared transition for state "\${fromState}" and event "\${event}"\`
        );
        this.name = 'BehaviorGraphViolation';
    }
}

export class BehaviorGraphEngine {
    private currentState: BehaviorState = INITIAL_STATE;

    get state(): BehaviorState {
        return this.currentState;
    }

    /**
     * Applies an event against the current state using only the frozen
     * transition table compiled from the director contract's behavior
     * graph. An event without a declared edge from the current state never
     * mutates \`currentState\`: it throws a BehaviorGraphViolation instead of
     * silently advancing.
     */
    send(event: string): BehaviorState {
        const key = \`\${this.currentState} \${event}\`;
        const next = TRANSITIONS.get(key);
        if (next === undefined) {
            throw new BehaviorGraphViolation(this.currentState, event);
        }
        this.currentState = next;
        return this.currentState;
    }

    reset(): void {
        this.currentState = INITIAL_STATE;
    }
}
`;
}
