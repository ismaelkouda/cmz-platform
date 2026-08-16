// A generic, contract-driven presentation flow (ADR-0030 "Presentation
// intent": vues, navigation, interactions, contenu, accessibilité). This
// module is deliberately domain-agnostic: it never hard-codes a step id or
// field name. It validates a { kind, steps } wizard declaration and
// compiles it into a normalized, ordered step table plus a completeness
// predicate used by the rendered runtime guard shared by the Angular and
// ReactJS profiles.
//
// Deliberately NOT built on top of core/behavior-graph.mjs (PLAT-5I): per
// ADR-0030 the Behavior model (states/operations/transitions/execution
// graph) and the Presentation intent (views/navigation/interactions,
// including a wizard's step order) are two distinct axes of the canonical
// IR, and the director contract mirrors that split — `behavior_graph` and
// `presentation` are sibling keys under `evolution`, each with its own gap
// tracking. A wizard step is not a named state reached by an arbitrary
// declared event: it is a position in a fixed, linear, contract-declared
// order, and progression is gated by field completeness of the current
// step, not by an event vocabulary. Reusing the behavior-graph engine here
// would force step ids to double as behavior-graph node names and field
// completeness to be re-expressed as an event — an artificial coupling of
// two axes the ADR keeps orthogonal. Progression fail-closed here means:
// only the immediate next declared step may be entered, only once every
// field the current step declares is present and non-blank, and any other
// requested step (skipped-ahead, out-of-order, or unknown) is refused
// without changing the current step.

function fail(message) {
    throw new Error(`presentation flow: ${message}`);
}

/**
 * Validates the raw declaration ({ kind, steps }) coming from the director
 * contract. Throws on any structural problem: missing/duplicate step ids,
 * a non-array `fields` list, or an empty step list.
 */
export function validatePresentationFlow(declaration) {
    if (!declaration || typeof declaration !== 'object') {
        fail('declaration must be an object');
    }
    const { kind, steps } = declaration;
    if (typeof kind !== 'string' || kind.length === 0) {
        fail('kind must be a non-empty string');
    }
    if (!Array.isArray(steps) || steps.length === 0) {
        fail('steps must be a non-empty array');
    }
    const seenIds = new Set();
    for (const [index, step] of steps.entries()) {
        const path = `steps[${index}]`;
        if (!step || typeof step !== 'object') {
            fail(`${path}: must be an object`);
        }
        const { id, fields } = step;
        if (typeof id !== 'string' || id.length === 0) {
            fail(`${path}.id: must be a non-empty string`);
        }
        if (seenIds.has(id)) {
            fail(`${path}: duplicate step id ${id}`);
        }
        seenIds.add(id);
        if (!Array.isArray(fields)) {
            fail(`${path}.fields: must be an array`);
        }
        for (const field of fields) {
            if (typeof field !== 'string' || field.length === 0) {
                fail(`${path}.fields: each field must be a non-empty string`);
            }
        }
    }
    return declaration;
}

/**
 * Compiles a validated declaration into a normalized, order-indexed step
 * table. `order` maps a step id to its zero-based position; `byId` maps a
 * step id to its declared fields.
 */
export function compilePresentationFlow(declaration) {
    validatePresentationFlow(declaration);
    const { kind, steps } = declaration;
    const order = new Map(steps.map((step, index) => [step.id, index]));
    const byId = new Map(steps.map((step) => [step.id, [...step.fields]]));
    return {
        schema_version: '1.0.0',
        kind,
        stepIds: steps.map((step) => step.id),
        order,
        byId,
        initial: steps[0].id,
        terminal: steps.at(-1).id,
    };
}

/**
 * A step's declared fields are complete when every field name it lists is
 * present as a key in `values` and holds a non-blank value (non-empty
 * after trimming for strings; any other defined, non-null value passes
 * as-is). A step with no declared fields (e.g. a pure review/summary step)
 * is always complete.
 */
export function isStepComplete(compiled, stepId, values) {
    const fields = compiled.byId.get(stepId);
    if (fields === undefined) fail(`unknown step ${stepId}`);
    const source = values ?? {};
    return fields.every((field) => {
        const value = source[field];
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
    });
}

/**
 * Applies a single "advance to `targetStepId`" request against
 * `currentStepId`, using `values` to judge completeness of the current
 * step. Fail-closed: advancing is accepted only when `targetStepId` is
 * exactly the step immediately following `currentStepId` in the declared
 * order AND the current step's declared fields are all complete;
 * everything else (skipping ahead, an unknown step id, advancing before
 * completion, or "advancing" while already on the terminal step) is
 * refused and returns the unchanged current step.
 */
export function applyPresentationAdvance(
    compiled,
    currentStepId,
    targetStepId,
    values
) {
    const currentIndex = compiled.order.get(currentStepId);
    const targetIndex = compiled.order.get(targetStepId);
    if (currentIndex === undefined) fail(`unknown step ${currentStepId}`);
    if (targetIndex === undefined) {
        return { accepted: false, step: currentStepId };
    }
    if (targetIndex !== currentIndex + 1) {
        return { accepted: false, step: currentStepId };
    }
    if (!isStepComplete(compiled, currentStepId, values)) {
        return { accepted: false, step: currentStepId };
    }
    return { accepted: true, step: targetStepId };
}

/**
 * Applies a "go back to `targetStepId`" request against `currentStepId`.
 * Fail-closed: only stepping back to the step immediately preceding
 * `currentStepId` is accepted; going back further than one step, going
 * back from the initial step, or targeting any step out of the declared
 * order is refused and returns the unchanged current step. Going back
 * never re-checks field completeness — it is always allowed to revisit an
 * earlier step to change already-entered data.
 */
export function applyPresentationBack(compiled, currentStepId, targetStepId) {
    const currentIndex = compiled.order.get(currentStepId);
    const targetIndex = compiled.order.get(targetStepId);
    if (currentIndex === undefined) fail(`unknown step ${currentStepId}`);
    if (targetIndex === undefined) {
        return { accepted: false, step: currentStepId };
    }
    if (targetIndex !== currentIndex - 1) {
        return { accepted: false, step: currentStepId };
    }
    return { accepted: true, step: targetStepId };
}
