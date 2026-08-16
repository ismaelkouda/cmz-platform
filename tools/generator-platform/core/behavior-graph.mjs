// A generic, contract-driven behavior graph (ADR-0030 "Behavior model":
// states, operations, transitions, graph d'exécution). This module is
// deliberately domain-agnostic: it never hard-codes state or event names.
// It validates a { initial, nodes, edges } declaration and compiles it into
// a normalized transition table plus rendered runtime guard code shared by
// the Angular and ReactJS profiles. Fail-closed is the only supported mode:
// an event that has no declared edge from the current state never produces
// a new state — the caller always gets back the unchanged state alongside a
// rejection.

function fail(message) {
    throw new Error(`behavior graph: ${message}`);
}

/**
 * Validates the raw declaration ({ initial, nodes, edges }) coming from the
 * director contract. Throws on any structural problem: unknown node
 * references, duplicate nodes, an initial state outside the node set, or a
 * transition that is not reachable from the declared initial state.
 */
export function validateBehaviorGraph(declaration) {
    if (!declaration || typeof declaration !== 'object') {
        fail('declaration must be an object');
    }
    const { initial, nodes, edges } = declaration;
    if (!Array.isArray(nodes) || nodes.length === 0) {
        fail('nodes must be a non-empty array');
    }
    if (new Set(nodes).size !== nodes.length) {
        fail('nodes must be unique');
    }
    if (typeof initial !== 'string' || !nodes.includes(initial)) {
        fail('initial must reference a declared node');
    }
    if (!Array.isArray(edges) || edges.length === 0) {
        fail('edges must be a non-empty array');
    }
    const seen = new Set();
    for (const [index, edge] of edges.entries()) {
        const path = `edges[${index}]`;
        if (!edge || typeof edge !== 'object')
            fail(`${path}: must be an object`);
        const { from, event, to } = edge;
        if (!nodes.includes(from)) fail(`${path}.from: unknown node ${from}`);
        if (!nodes.includes(to)) fail(`${path}.to: unknown node ${to}`);
        if (typeof event !== 'string' || event.length === 0) {
            fail(`${path}.event: must be a non-empty string`);
        }
        const key = `${from} ${event}`;
        if (seen.has(key)) {
            fail(`${path}: duplicate transition for ${from}/${event}`);
        }
        seen.add(key);
    }
    const reachable = new Set([initial]);
    let grew = true;
    while (grew) {
        grew = false;
        for (const edge of edges) {
            if (reachable.has(edge.from) && !reachable.has(edge.to)) {
                reachable.add(edge.to);
                grew = true;
            }
        }
    }
    const unreachable = nodes.filter((node) => !reachable.has(node));
    if (unreachable.length > 0) {
        fail(`unreachable nodes from initial: ${unreachable.join(', ')}`);
    }
    return declaration;
}

/**
 * Compiles a validated declaration into a normalized, order-independent
 * transition table keyed by `${from} ${event}` and exposes the terminal
 * nodes (nodes with no outgoing edge) for callers that need to know when a
 * graph has settled.
 */
export function compileBehaviorGraph(declaration) {
    validateBehaviorGraph(declaration);
    const { initial, nodes, edges } = declaration;
    const transitions = new Map(
        edges.map((edge) => [`${edge.from} ${edge.event}`, edge.to])
    );
    const nodesWithOutgoingEdges = new Set(edges.map((edge) => edge.from));
    const terminal = nodes.filter((node) => !nodesWithOutgoingEdges.has(node));
    return {
        schema_version: '1.0.0',
        initial,
        nodes: [...nodes],
        edges: edges.map((edge) => ({ ...edge })),
        terminal,
        transitions,
    };
}

/**
 * Applies a single event against a state using the compiled transition
 * table. Fail-closed: when `${state}/${event}` has no declared edge, the
 * function returns `{ accepted: false, state }` — the same state object is
 * returned unchanged, never a guessed or partial transition.
 */
export function applyBehaviorEvent(compiled, state, event) {
    const to = compiled.transitions.get(`${state} ${event}`);
    if (to === undefined) {
        return { accepted: false, state };
    }
    return { accepted: true, state: to };
}
