import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { compileWorkflowActionDefinition } from '../core/workflow-action-authoring.mjs';
import { repositoryRoot, validateJsonSchema } from '../validate-ir.mjs';

export async function adaptStructuredWorkflow(
    definitionPath,
    { definitionSchema } = {}
) {
    const absolutePath = resolve(definitionPath);
    const content = await readFile(absolutePath);
    const definition = JSON.parse(content.toString('utf8'));
    if (definitionSchema) {
        const errors = validateJsonSchema(definition, definitionSchema);
        if (errors.length) {
            throw new Error(
                `invalid workflow-action definition:\n${errors.join('\n')}`
            );
        }
    }
    return {
        definition,
        ...compileWorkflowActionDefinition(definition, {
            sourceUri: relative(repositoryRoot, absolutePath).replaceAll(
                '\\',
                '/'
            ),
            sourceSha256: createHash('sha256').update(content).digest('hex'),
        }),
    };
}
