import { compilePresentationFlow } from '../core/presentation-flow.mjs';

// Renders a generic, data-driven wizard runtime for a presentation flow
// declared by the director contract (ADR-0030 Presentation intent: vues,
// navigation, interactions). The generated code never hard-codes a step id
// or field name as control flow: it walks a frozen, ordered step table
// produced from the exact `{ kind, steps }` declaration it was compiled
// from, and fails closed (no step change, a rejection result) on any
// advance request that is not exactly "the next declared step, with the
// current step's declared fields complete" — including skipping ahead,
// targeting an unknown step, or advancing before completion. Going back is
// allowed one step at a time without a completeness check, matching a
// wizard's usual "you may revisit and edit what you already entered"
// expectation (ADR-0030 leaves this UX choice to the profile; documented
// here as the flow engine's contract).

function renderFieldsTableLiteral(compiled) {
    const entries = compiled.stepIds
        .map((id) => {
            const fields = compiled.byId
                .get(id)
                .map((field) => `'${field}'`)
                .join(', ');
            return `    ['${id}', [${fields}]],`;
        })
        .join('\n');
    return `[\n${entries}\n]`;
}

export function renderPresentationFlowEngine(declaration) {
    const compiled = compilePresentationFlow(declaration);
    const stepUnion = compiled.stepIds.map((id) => `'${id}'`).join(' | ');
    const orderLiteral = `[${compiled.stepIds.map((id) => `'${id}'`).join(', ')}]`;
    const fieldsTable = renderFieldsTableLiteral(compiled);
    return `export type PresentationStep = ${stepUnion};

export interface PresentationAdvanceResult {
    readonly accepted: boolean;
    readonly step: PresentationStep;
}

const INITIAL_STEP: PresentationStep = '${compiled.initial}';
const STEP_ORDER: readonly PresentationStep[] = ${orderLiteral};
const STEP_FIELDS = new Map<PresentationStep, readonly string[]>(${fieldsTable});

export class PresentationFlowViolation extends Error {
    readonly code = 'presentation_flow_advance_refused';

    constructor(
        readonly fromStep: PresentationStep,
        readonly targetStep: string,
        readonly reason: string
    ) {
        super(
            \`Advance from "\${fromStep}" to "\${targetStep}" refused: \${reason}\`
        );
        this.name = 'PresentationFlowViolation';
    }
}

function isFieldValueComplete(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
}

export class PresentationFlowEngine {
    private currentStep: PresentationStep = INITIAL_STEP;

    get step(): PresentationStep {
        return this.currentStep;
    }

    /**
     * Reports whether every field the current step declares is present
     * and non-blank in \`values\`. A step with no declared fields (e.g. a
     * pure review step) is always complete.
     */
    isCurrentStepComplete(values: Readonly<Record<string, unknown>>): boolean {
        const fields = STEP_FIELDS.get(this.currentStep) ?? [];
        return fields.every((field) => isFieldValueComplete(values[field]));
    }

    /**
     * Advances to \`targetStep\` only when it is exactly the step
     * immediately following the current step in the declared order AND
     * the current step's declared fields are all complete in \`values\`.
     * Throws PresentationFlowViolation and never mutates the current step
     * otherwise — skipping ahead, an unknown step, or advancing before
     * completion are all refused the same way.
     */
    advance(
        targetStep: string,
        values: Readonly<Record<string, unknown>>
    ): PresentationStep {
        const currentIndex = STEP_ORDER.indexOf(this.currentStep);
        const targetIndex = STEP_ORDER.indexOf(targetStep as PresentationStep);
        if (targetIndex === -1) {
            throw new PresentationFlowViolation(
                this.currentStep,
                targetStep,
                'unknown step'
            );
        }
        if (targetIndex !== currentIndex + 1) {
            throw new PresentationFlowViolation(
                this.currentStep,
                targetStep,
                'not the next declared step'
            );
        }
        if (!this.isCurrentStepComplete(values)) {
            throw new PresentationFlowViolation(
                this.currentStep,
                targetStep,
                'current step is incomplete'
            );
        }
        this.currentStep = targetStep as PresentationStep;
        return this.currentStep;
    }

    /**
     * Steps back to \`targetStep\` only when it is exactly the step
     * immediately preceding the current step. Never re-checks field
     * completeness: revisiting an earlier step to edit already-entered
     * data is always allowed once you are past it.
     */
    back(targetStep: string): PresentationStep {
        const currentIndex = STEP_ORDER.indexOf(this.currentStep);
        const targetIndex = STEP_ORDER.indexOf(targetStep as PresentationStep);
        if (targetIndex === -1 || targetIndex !== currentIndex - 1) {
            throw new PresentationFlowViolation(
                this.currentStep,
                targetStep,
                'not the immediately preceding step'
            );
        }
        this.currentStep = targetStep as PresentationStep;
        return this.currentStep;
    }

    reset(): void {
        this.currentStep = INITIAL_STEP;
    }
}
`;
}
