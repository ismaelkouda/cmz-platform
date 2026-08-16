import { pascalCase } from './shared.mjs';

export function renderActionAfterSuccessContract(semantic) {
    const outputs = [
        ...new Set(
            semantic.operations.map((operation) =>
                pascalCase(operation.output.name)
            )
        ),
    ];
    const variants = semantic.operations
        .map(
            (operation) =>
                `    | { readonly operationId: '${operation.id}'; readonly output: ${pascalCase(operation.output.name)} }`
        )
        .join('\n');
    return `import type { ${outputs.join(', ')} } from './models';

export type AfterSuccessContext =
${variants};

export type AfterSuccessExtension = (
    context: AfterSuccessContext
) => Promise<void>;
`;
}

export function renderWorkflowAfterSuccessContract(model) {
    const operations = model.operations.map(({ id }) => `'${id}'`).join(' | ');
    return `import type { WorkflowResult } from './models';

export interface AfterSuccessContext {
    readonly operationId: ${operations};
    readonly output: WorkflowResult;
}

export type AfterSuccessExtension = (
    context: AfterSuccessContext
) => Promise<void>;
`;
}

export function renderAfterSuccessExtension() {
    return `import type { AfterSuccessExtension } from './extension-contract';

export const afterSuccess: AfterSuccessExtension = async (_context) => {
    // Human-owned extension point. This file is preserved during regeneration.
};
`;
}
